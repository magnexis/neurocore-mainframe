use serde::Serialize;
use std::time::{SystemTime, UNIX_EPOCH};
use sysinfo::System;

#[derive(Serialize)]
pub struct Process {
    id: String,
    name: &'static str,
    status: &'static str,
    load: u8,
    details: &'static str,
}

#[derive(Serialize)]
pub struct RealProcess {
    id: String,
    name: String,
    status: &'static str,
    load: u8,
    details: String,
}

const PROCESSES: &[(&str, &str, &str)] = &[
    (
        "neural-sync.exe",
        "ACTIVE",
        "Synchronizes local thought vectors with the hidden bus.",
    ),
    (
        "ghost-cache.daemon",
        "IDLE",
        "Keeps recently decoded archive fragments warm.",
    ),
    (
        "signal-probe.bin",
        "ACTIVE",
        "Scans for coherent pulses across the outer lattice.",
    ),
    (
        "memory-weave.sys",
        "ACTIVE",
        "Compacts volatile blocks into stable neural pages.",
    ),
    (
        "blackbox-watch",
        "LOCKED",
        "Observes protected kernel events without disclosing payload.",
    ),
    (
        "operator-shell",
        "ACTIVE",
        "Routes command input through sanitized simulation space.",
    ),
];

#[derive(Serialize)]
#[serde(untagged)]
pub enum ProcessRow {
    Simulated(Process),
    Real(RealProcess),
}

pub fn get_processes(real: bool) -> Vec<ProcessRow> {
    if real {
        return get_real_processes();
    }

    let now = now_seconds();

    PROCESSES
        .iter()
        .enumerate()
        .map(|(index, (name, status, details))| {
            let wave = ((now / 7.0 + index as f64).sin() * 31.0) + 42.0;
            let jitter = rand::random_range(0.0..12.0);
            let load = (wave + jitter).round().clamp(8.0, 96.0) as u8;

            ProcessRow::Simulated(Process {
                id: format!("proc-{}", index + 1),
                name,
                status,
                load,
                details,
            })
        })
        .collect()
}

fn get_real_processes() -> Vec<ProcessRow> {
    let mut system = System::new_all();
    system.refresh_all();
    let mut rows: Vec<RealProcess> = system
        .processes()
        .iter()
        .map(|(pid, process)| {
            let cpu = process.cpu_usage().round().clamp(0.0, 100.0) as u8;
            let memory_mb = process.memory() / 1024 / 1024;
            RealProcess {
                id: format!("pid-{pid}"),
                name: process.name().to_string_lossy().into_owned(),
                status: "LOCAL",
                load: cpu,
                details: format!("Local PID {pid} // memory {memory_mb} MB // disk and network activity are not sampled."),
            }
        })
        .collect();

    rows.sort_by(|a, b| b.load.cmp(&a.load).then_with(|| a.name.cmp(&b.name)));
    rows.truncate(12);
    rows.into_iter().map(ProcessRow::Real).collect()
}

fn now_seconds() -> f64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs_f64())
        .unwrap_or_default()
}
