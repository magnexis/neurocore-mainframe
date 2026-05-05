use serde::Serialize;

#[derive(Clone, Serialize)]
pub struct ArchiveRecord {
    id: &'static str,
    title: &'static str,
    status: &'static str,
    clearance: &'static str,
}

const RECORDS: &[ArchiveRecord] = &[
    ArchiveRecord {
        id: "A-001",
        title: "First contact with hidden process layer",
        status: "Recovered",
        clearance: "green",
    },
    ArchiveRecord {
        id: "A-047",
        title: "Operator imprint calibration",
        status: "Encrypted",
        clearance: "cyan",
    },
    ArchiveRecord {
        id: "B-122",
        title: "Signal bloom above threshold",
        status: "Recovered",
        clearance: "green",
    },
    ArchiveRecord {
        id: "C-304",
        title: "Mirror node accepted handshake",
        status: "Sealed",
        clearance: "purple",
    },
    ArchiveRecord {
        id: "D-909",
        title: "Memory lattice self-repair event",
        status: "Recovered",
        clearance: "green",
    },
    ArchiveRecord {
        id: "X-000",
        title: "Unknown entity observed behind bus",
        status: "Restricted",
        clearance: "red",
    },
];

pub fn all() -> Vec<ArchiveRecord> {
    RECORDS.to_vec()
}

pub fn search(query: &str) -> Vec<ArchiveRecord> {
    let needle = query.trim().to_lowercase();

    RECORDS
        .iter()
        .filter(|record| {
            format!(
                "{} {} {} {}",
                record.id, record.title, record.status, record.clearance
            )
            .to_lowercase()
            .contains(&needle)
        })
        .cloned()
        .collect()
}
