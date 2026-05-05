use serde::Serialize;

#[derive(Serialize)]
pub struct DataAdapter {
    id: &'static str,
    label: &'static str,
    status: &'static str,
    source: &'static str,
}

pub fn trusted_adapters() -> Vec<DataAdapter> {
    vec![
        DataAdapter {
            id: "local-sysinfo",
            label: "Local Sysinfo",
            status: "trusted",
            source: "Rust sysinfo sampler",
        },
        DataAdapter {
            id: "sim-detection",
            label: "Detection Simulator",
            status: "trusted",
            source: "Local deterministic simulation",
        },
        DataAdapter {
            id: "operator-session",
            label: "Operator Session",
            status: "trusted",
            source: "Optional local JSON persistence",
        },
    ]
}
