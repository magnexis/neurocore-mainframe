use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::System;

#[derive(Serialize)]
pub struct Telemetry {
    #[serde(rename = "integrity")]
    integrity: f64,
    #[serde(rename = "neuralLoad")]
    neural_load: f64,
    entropy: f64,
    uplink: f64,
    status: &'static str,
    stability: &'static str,
    mode: &'static str,
    #[serde(rename = "memoryUsed")]
    memory_used: Option<u64>,
    #[serde(rename = "memoryTotal")]
    memory_total: Option<u64>,
    timestamp: u64,
}

pub fn get_telemetry(real: bool) -> Telemetry {
    if real {
        return real_telemetry();
    }

    let now = now_seconds();

    Telemetry {
        integrity: 97.0 + (now / 9.0).sin() * 1.4,
        neural_load: 41.0 + (now / 5.0).sin() * 8.0,
        entropy: 7.0 + (now / 7.0).cos() * 2.0,
        uplink: 780.0 + (now / 6.0).sin() * 42.0,
        status: "ONLINE",
        stability: "STABLE",
        mode: "simulated",
        memory_used: None,
        memory_total: None,
        timestamp: now as u64,
    }
}

fn real_telemetry() -> Telemetry {
    let mut system = System::new_all();
    system.refresh_all();
    let cpu = f64::from(system.global_cpu_usage());
    let memory_total = system.total_memory();
    let memory_used = system.used_memory();
    let memory_percent = if memory_total == 0 {
        0.0
    } else {
        (memory_used as f64 / memory_total as f64) * 100.0
    };

    Telemetry {
        integrity: (100.0 - (cpu * 0.28 + memory_percent * 0.16)).clamp(62.0, 99.8),
        neural_load: cpu,
        entropy: ((cpu - memory_percent).abs() / 10.0).clamp(0.5, 18.0),
        uplink: memory_percent,
        status: "ONLINE",
        stability: if cpu < 82.0 && memory_percent < 88.0 {
            "STABLE"
        } else {
            "PRESSURE"
        },
        mode: "real",
        memory_used: Some(memory_used),
        memory_total: Some(memory_total),
        timestamp: now_seconds() as u64,
    }
}

fn now_seconds() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs_f64())
        .unwrap_or_default()
}
