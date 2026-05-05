use rand::prelude::IndexedRandom;
use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Serialize)]
pub struct LogEntry {
    time: String,
    message: String,
    level: &'static str,
}

const TEMPLATES: &[&str] = &[
    "GHOST_ROUTE[{sector}] isolated at {value}% confidence",
    "MEMORY_PAGE 0x{hex} rewoven into {state} lattice",
    "SIGNAL_BLOOM detected on {channel} / phase drift {value}deg",
    "ARCHIVE_FRAGMENT {archive} re-indexed // clearance {state}",
    "PROCESS_SHADOW {process} forked into low-noise lane",
    "SONAR_CONTACT {sector} depth {value}m / return {state}",
    "DETECTION_SWEEP {room} profile returned {state}",
    "KEYSTREAM rotated // entropy delta {value}.{digit}",
    "NODE_HANDSHAKE {sector}::{channel} accepted in {digit}ms",
    "THERMAL_TRACE corridor-{digit} cooled to {value}K",
    "OPERATOR_ECHO sampled // signature {hex}",
    "CACHE_PRESSURE dropped {value}% after micro flush",
    "MIRROR_BUS reported {state} reflection",
    "NEURAL_LINK heartbeat {value} bpm // jitter {digit}ms",
    "BLACKBOX_WATCH sealed event chain {hex}",
    "PACKET_RAIN intensity shifted to {state}",
    "VAULT_DOOR virtual lock cycled // pin {hex}",
    "ANOMALY_INDEX recalculated at 0.{value}",
];
const SECTORS: &[&str] = &[
    "NORTH", "EAST", "WEST", "SOUTH", "LUNA", "VAULT", "ORBIT", "SPINE", "WINDOW", "CEILING",
];
const STATES: &[&str] = &[
    "STABLE", "TRACE", "CLEAN", "HOT", "QUIET", "MIRRORED", "SEALED", "RISING", "NOMINAL",
];
const CHANNELS: &[&str] = &["ALPHA", "DELTA", "THETA", "OMEGA"];
const ROOMS: &[&str] = &[
    "OFFICE",
    "APARTMENT",
    "WAREHOUSE",
    "CLEANROOM",
    "SERVER BAY",
];
const PROCESSES: &[&str] = &[
    "neural-sync",
    "ghost-cache",
    "signal-probe",
    "memory-weave",
    "operator-shell",
];

pub fn push_random(entries: &mut Vec<LogEntry>) {
    let mut rng = rand::rng();
    let template = TEMPLATES.choose(&mut rng).unwrap_or(&"TRACE_CORE STABLE");
    let message = template
        .replace("{sector}", SECTORS.choose(&mut rng).unwrap_or(&"CORE"))
        .replace("{state}", STATES.choose(&mut rng).unwrap_or(&"STABLE"))
        .replace("{channel}", CHANNELS.choose(&mut rng).unwrap_or(&"ALPHA"))
        .replace("{room}", ROOMS.choose(&mut rng).unwrap_or(&"OFFICE"))
        .replace(
            "{process}",
            PROCESSES.choose(&mut rng).unwrap_or(&"neural-sync"),
        )
        .replace("{value}", &rand::random_range(12..99).to_string())
        .replace("{digit}", &rand::random_range(2..9).to_string())
        .replace(
            "{archive}",
            &format!(
                "{}-{}",
                (b'A' + rand::random_range(0..6)) as char,
                rand::random_range(10..900)
            ),
        )
        .replace(
            "{hex}",
            &format!("{:X}", rand::random_range(0x1000..0xffff)),
        );

    push(entries, message);
}

pub fn push(entries: &mut Vec<LogEntry>, message: String) {
    let level = if rand::random_bool(0.18) {
        "warn"
    } else {
        "ok"
    };

    entries.insert(
        0,
        LogEntry {
            time: time_label(),
            message,
            level,
        },
    );
    entries.truncate(120);
}

pub fn snapshot(entries: &mut Vec<LogEntry>) -> Vec<LogEntry> {
    while entries.len() < 10 {
        push_random(entries);
    }

    entries.clone()
}

fn time_label() -> String {
    let total_seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or_default()
        % 86_400;
    let hours = total_seconds / 3600;
    let minutes = (total_seconds % 3600) / 60;
    let seconds = total_seconds % 60;

    format!("{hours:02}:{minutes:02}:{seconds:02}")
}
