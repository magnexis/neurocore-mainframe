mod services;

use axum::{
    Json, Router,
    extract::{Query, State},
    http::{HeaderValue, StatusCode, header},
    response::IntoResponse,
    routing::{get, post},
};
use serde::Deserialize;
use serde_json::{Value, json};
use services::{
    adapters, archive, commands,
    logs::{self, LogEntry},
    processes, session, telemetry,
};
use std::{
    env,
    net::SocketAddr,
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};
use tokio::net::TcpListener;
use tower_http::{
    limit::RequestBodyLimitLayer,
    services::{ServeDir, ServeFile},
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};

const MAX_COMMAND_LEN: usize = 80;
const MAX_TARGET_LEN: usize = 120;
const MAX_SESSION_BYTES: usize = 8 * 1024;

#[derive(Clone)]
struct AppState {
    logs: Arc<Mutex<Vec<LogEntry>>>,
}

#[derive(Deserialize)]
struct ArchiveQuery {
    q: Option<String>,
}

#[derive(Deserialize)]
struct RealQuery {
    real: Option<bool>,
}

#[derive(Deserialize)]
struct CommandPayload {
    command: Option<String>,
}

#[derive(Deserialize)]
struct ActionPayload {
    module: String,
    action: String,
    target: Option<String>,
}

#[tokio::main]
async fn main() {
    let host = env::var("HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = env::var("PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(8787);

    let state = AppState {
        logs: Arc::new(Mutex::new(Vec::new())),
    };

    let static_dir = static_dir();
    let fallback = ServeFile::new(static_dir.join("index.html"));

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/telemetry", get(telemetry_handler))
        .route("/api/processes", get(processes_handler))
        .route("/api/logs", get(logs_handler))
        .route("/api/archive", get(archive_handler))
        .route("/api/adapters", get(adapters_handler))
        .route(
            "/api/session",
            get(session_get_handler).post(session_post_handler),
        )
        .route("/api/action", post(action_handler))
        .route("/api/command", post(command_handler))
        .fallback_service(ServeDir::new(static_dir).fallback(fallback))
        .layer(security_headers())
        .layer(RequestBodyLimitLayer::new(16 * 1024))
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let address: SocketAddr = format!("{host}:{port}")
        .parse()
        .expect("HOST and PORT must form a valid socket address");
    let listener = TcpListener::bind(address)
        .await
        .expect("failed to bind NeuroCore backend port");

    println!("NeuroCore Rust backend online at http://{address}");
    axum::serve(listener, app)
        .await
        .expect("NeuroCore backend stopped unexpectedly");
}

fn static_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("backend directory should have a project root parent")
        .join("frontend")
        .join("dist")
}

async fn health() -> impl IntoResponse {
    Json(json!({
        "status": "online",
        "stability": "stable",
        "service": "neurocore-rust-backend",
        "timestamp": timestamp()
    }))
}

async fn telemetry_handler(Query(query): Query<RealQuery>) -> impl IntoResponse {
    Json(telemetry::get_telemetry(query.real.unwrap_or(false)))
}

async fn processes_handler(Query(query): Query<RealQuery>) -> impl IntoResponse {
    Json(json!({ "processes": processes::get_processes(query.real.unwrap_or(false)) }))
}

async fn logs_handler(State(state): State<AppState>) -> impl IntoResponse {
    let mut entries = state.logs.lock().expect("log state lock poisoned");
    logs::push_random(&mut entries);
    Json(json!({ "logs": logs::snapshot(&mut entries) }))
}

async fn archive_handler(Query(query): Query<ArchiveQuery>) -> impl IntoResponse {
    let records = match query.q.as_deref() {
        Some(value) if !value.trim().is_empty() => archive::search(value),
        _ => archive::all(),
    };

    Json(json!({ "records": records }))
}

async fn adapters_handler() -> impl IntoResponse {
    Json(json!({ "adapters": adapters::trusted_adapters() }))
}

async fn session_get_handler() -> impl IntoResponse {
    Json(session::read())
}

async fn session_post_handler(Json(payload): Json<Value>) -> impl IntoResponse {
    if serde_json::to_vec(&payload)
        .map(|bytes| bytes.len() > MAX_SESSION_BYTES)
        .unwrap_or(true)
    {
        return bad_request("session payload exceeds local storage limit");
    }

    (StatusCode::OK, Json(session::write(payload))).into_response()
}

async fn command_handler(
    State(state): State<AppState>,
    Json(payload): Json<CommandPayload>,
) -> impl IntoResponse {
    let command = payload.command.unwrap_or_default();
    let command = command.trim();
    if command.len() > MAX_COMMAND_LEN {
        return bad_request("command exceeds maximum length");
    }
    let result = commands::handle(command);

    let mut entries = state.logs.lock().expect("log state lock poisoned");
    logs::push(
        &mut entries,
        format!("OPERATOR COMMAND: {}", null_label(command)),
    );

    (StatusCode::OK, Json(json!(result))).into_response()
}

async fn action_handler(
    State(state): State<AppState>,
    Json(payload): Json<ActionPayload>,
) -> impl IntoResponse {
    if !is_known_action(&payload.module, &payload.action) {
        return bad_request("unknown module/action pair");
    }
    let target = payload.target.unwrap_or_default();
    if target.len() > MAX_TARGET_LEN {
        return bad_request("action target exceeds maximum length");
    }
    let message = action_message(&payload.module, &payload.action, &target);

    let mut entries = state.logs.lock().expect("log state lock poisoned");
    logs::push(
        &mut entries,
        format!("{} :: {}", payload.module.to_uppercase(), message),
    );

    Json(json!({
        "ok": true,
        "module": payload.module,
        "action": payload.action,
        "target": target,
        "message": message,
        "timestamp": timestamp()
    }))
    .into_response()
}

fn security_headers() -> (
    SetResponseHeaderLayer<HeaderValue>,
    SetResponseHeaderLayer<HeaderValue>,
    SetResponseHeaderLayer<HeaderValue>,
    SetResponseHeaderLayer<HeaderValue>,
    SetResponseHeaderLayer<HeaderValue>,
    SetResponseHeaderLayer<HeaderValue>,
) {
    (
        SetResponseHeaderLayer::if_not_present(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ),
        SetResponseHeaderLayer::if_not_present(
            header::X_FRAME_OPTIONS,
            HeaderValue::from_static("DENY"),
        ),
        SetResponseHeaderLayer::if_not_present(
            header::REFERRER_POLICY,
            HeaderValue::from_static("no-referrer"),
        ),
        SetResponseHeaderLayer::if_not_present(
            header::HeaderName::from_static("permissions-policy"),
            HeaderValue::from_static("camera=(), microphone=(), geolocation=(), usb=(), serial=()"),
        ),
        SetResponseHeaderLayer::if_not_present(
            header::HeaderName::from_static("cross-origin-opener-policy"),
            HeaderValue::from_static("same-origin"),
        ),
        SetResponseHeaderLayer::if_not_present(
            header::CONTENT_SECURITY_POLICY,
            HeaderValue::from_static(
                "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
            ),
        ),
    )
}

fn bad_request(message: &str) -> axum::response::Response {
    (
        StatusCode::BAD_REQUEST,
        Json(json!({
            "ok": false,
            "error": message,
            "timestamp": timestamp()
        })),
    )
        .into_response()
}

fn is_known_action(module: &str, action: &str) -> bool {
    matches!(
        (module, action),
        ("core", "diagnostic")
            | ("core", "stabilize")
            | ("core", "refresh")
            | ("process", "refresh")
            | ("process", "sort")
            | ("process", "inspect")
            | ("network", "scan")
            | ("network", "isolate")
            | ("network", "boost")
            | ("memory", "compact")
            | ("memory", "flush")
            | ("memory", "seal")
            | ("signal", "scan")
            | ("signal", "tune")
            | ("signal", "invert")
            | ("archive", "decrypt")
            | ("archive", "export")
            | ("archive", "clear")
            | ("detection", "sweep")
            | ("detection", "triangulate")
            | ("detection", "jam")
            | ("prototype", "ping")
            | ("prototype", "sweep")
            | ("prototype", "lock")
            | ("prototype", "clear")
            | ("messages", "scan")
            | ("messages", "redact")
            | ("messages", "draft")
            | ("messages", "archive")
            | ("system-log", "marker")
            | ("system-log", "clear")
            | ("settings", "reset")
            | ("settings", "real-telemetry")
            | ("settings", "intensity-max")
            | ("settings", "intensity-low")
    )
}

fn null_label(value: &str) -> String {
    if value.trim().is_empty() {
        "NULL".to_string()
    } else {
        value.to_string()
    }
}

fn action_message(module: &str, action: &str, target: &str) -> String {
    match (module, action) {
        ("core", "diagnostic") => {
            "Deep diagnostic completed. Kernel drift remains below threshold.".to_string()
        }
        ("core", "stabilize") => {
            "Core stabilizer pulse accepted. Integrity envelope reinforced.".to_string()
        }
        ("core", "refresh") => "Telemetry frame refreshed from Rust backend.".to_string(),
        ("process", "refresh") => "Process table refreshed with live load vectors.".to_string(),
        ("process", "sort") => "Process table sorted by descending system pressure.".to_string(),
        ("process", "inspect") => format!("Inspection packet opened for {target}."),
        ("network", "scan") => "Network scan completed. No hostile uplink detected.".to_string(),
        ("network", "isolate") => "Ghost route isolated into a sandboxed relay.".to_string(),
        ("network", "boost") => "Primary transfer spine boosted for the next cycle.".to_string(),
        ("memory", "compact") => "Volatile memory compacted and index gaps closed.".to_string(),
        ("memory", "flush") => "Archive cache flushed into cold storage.".to_string(),
        ("memory", "seal") => "Selected memory blocks sealed against mutation.".to_string(),
        ("signal", "scan") => "Wide-band scan completed. Coherence improved.".to_string(),
        ("signal", "tune") => "Frequency tuner locked to the strongest carrier.".to_string(),
        ("signal", "invert") => "Waveform phase inverted for anomaly detection.".to_string(),
        ("archive", "decrypt") => "Recoverable archive fragments decrypted into view.".to_string(),
        ("archive", "export") => "Archive manifest prepared for operator review.".to_string(),
        ("archive", "clear") => "Archive query buffer cleared.".to_string(),
        ("detection", "sweep") => {
            "Theatrical area sweep completed. No confirmed spy devices detected.".to_string()
        }
        ("detection", "triangulate") => {
            "Trace triangulation simulated. Treat results as visual fiction only.".to_string()
        }
        ("detection", "jam") => {
            "Signal mask simulation engaged. No real radio activity changed.".to_string()
        }
        ("prototype", "ping") => {
            "Prototype sonar ping emitted into the simulated array.".to_string()
        }
        ("prototype", "sweep") => {
            "Prototype sonar wide sweep recalibrated synthetic contacts.".to_string()
        }
        ("prototype", "lock") => "Prototype sonar contact lock accepted.".to_string(),
        ("prototype", "clear") => "Prototype sonar ghost buffer cleared.".to_string(),
        ("messages", "scan") => {
            "Message thread scanned for emotional and operational tone.".to_string()
        }
        ("messages", "redact") => "Sensitive details redacted from the message view.".to_string(),
        ("messages", "draft") => "Simulated reply drafted locally for operator review.".to_string(),
        ("messages", "archive") => "Message thread moved to cold archive.".to_string(),
        ("system-log", "marker") => {
            "Manual operator marker inserted into the event stream.".to_string()
        }
        ("system-log", "clear") => "Visible log buffer cleared on the client surface.".to_string(),
        ("settings", "reset") => {
            "Interface preferences reset to factory signal profile.".to_string()
        }
        ("settings", "real-telemetry") => "Real local telemetry preference updated.".to_string(),
        ("settings", "intensity-max") => {
            "Theme intensity raised to maximum cinematic output.".to_string()
        }
        ("settings", "intensity-low") => {
            "Theme intensity lowered for quiet operations.".to_string()
        }
        _ => format!("Action {action} accepted for {module}."),
    }
}

fn timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
}
