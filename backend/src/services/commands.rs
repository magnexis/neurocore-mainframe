use serde::Serialize;

#[derive(Serialize)]
pub struct CommandResult {
    ok: bool,
    action: &'static str,
    message: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    route: Option<&'static str>,
}

pub fn handle(command: &str) -> CommandResult {
    match command.trim().to_lowercase().as_str() {
        "core" => route("core", "Routing to CORE module."),
        "process" => route("process", "Routing to PROCESS module."),
        "network" => route("network", "Routing to NETWORK module."),
        "memory" => route("memory", "Routing to MEMORY module."),
        "signal" => route("signal", "Routing to SIGNAL module."),
        "archive" => route("archive", "Routing to ARCHIVE module."),
        "detection" => route("detection", "Routing to DETECTION module."),
        "log" => route("system-log", "Opening SYSTEM LOG."),
        "prototype" => route("prototype", "Routing to PROTOTYPE module."),
        "messages" | "mail" => route("messages", "Opening MESSAGES simulator."),
        "settings" => route("settings", "Routing to SETTINGS module."),
        "help" => info(
            "Commands: core, process, network, memory, signal, archive, detection, log, prototype, messages, settings, unlock, pulse, quiet",
        ),
        "unlock" => info("Access already granted. Neural link remains active."),
        "pulse" => action("pulse", "Manual pulse injected into signal lattice."),
        "quiet" => action(
            "quiet",
            "Performance mode enabled. Ambient intensity reduced.",
        ),
        _ => CommandResult {
            ok: false,
            action: "unknown",
            message: "Unknown command. Type HELP for available commands.",
            route: None,
        },
    }
}

fn route(route: &'static str, message: &'static str) -> CommandResult {
    CommandResult {
        ok: true,
        action: "route",
        message,
        route: Some(route),
    }
}

fn info(message: &'static str) -> CommandResult {
    CommandResult {
        ok: true,
        action: "info",
        message,
        route: None,
    }
}

fn action(action: &'static str, message: &'static str) -> CommandResult {
    CommandResult {
        ok: true,
        action,
        message,
        route: None,
    }
}
