use serde_json::{Value, json};
use std::{env, fs, path::PathBuf};

fn session_path() -> PathBuf {
    env::var("NEUROCORE_SESSION_FILE")
        .map(PathBuf::from)
        .unwrap_or_else(|_| {
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .parent()
                .expect("backend directory should have a project root parent")
                .join(".neurocore-session.json")
        })
}

pub fn read() -> Value {
    let path = session_path();
    fs::read_to_string(path)
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_else(|| json!({ "enabled": false, "entries": [] }))
}

pub fn write(payload: Value) -> Value {
    let path = session_path();
    let stored = json!({
        "enabled": payload.get("enabled").and_then(Value::as_bool).unwrap_or(false),
        "updatedAt": payload.get("updatedAt").cloned().unwrap_or(Value::Null),
        "source": "local-operator-session",
    });
    let _ = fs::write(
        path,
        serde_json::to_string_pretty(&stored).unwrap_or_default(),
    );
    stored
}
