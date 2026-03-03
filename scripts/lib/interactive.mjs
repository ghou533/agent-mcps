import readline from "node:readline";

export async function selectAgentsInteractive(agents) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return [];
  }

  readline.emitKeypressEvents(process.stdin);
  const wasRaw = process.stdin.isRaw;
  if (!wasRaw) {
    process.stdin.setRawMode(true);
  }

  let cursor = 0;
  const selected = new Set(agents);
  let message = "";

  function render() {
    const lines = [];
    lines.push("Select agents (space to toggle, enter to confirm)");
    lines.push("");
    agents.forEach((agent, idx) => {
      const mark = selected.has(agent) ? "x" : " ";
      const pointer = idx === cursor ? ">" : " ";
      lines.push(`${pointer} [${mark}] ${agent}`);
    });
    lines.push("");
    lines.push("Keys: up/down move, space toggle, a toggle all, enter confirm, q cancel");
    if (message) {
      lines.push(message);
    }

    process.stdout.write("\x1b[2J\x1b[H");
    process.stdout.write(lines.join("\n"));
  }

  function cleanup() {
    process.stdin.removeListener("keypress", onKeypress);
    if (!wasRaw) {
      process.stdin.setRawMode(false);
    }
    process.stdout.write("\x1b[2J\x1b[H");
  }

  function toggleAll() {
    if (selected.size === agents.length) {
      selected.clear();
      return;
    }
    agents.forEach((agent) => selected.add(agent));
  }

  function onKeypress(_, key) {
    if (!key) {
      return;
    }

    if (key.ctrl && key.name === "c") {
      cleanup();
      process.exit(130);
    }

    if (key.name === "up") {
      cursor = cursor > 0 ? cursor - 1 : agents.length - 1;
      message = "";
      render();
      return;
    }
    if (key.name === "down") {
      cursor = cursor < agents.length - 1 ? cursor + 1 : 0;
      message = "";
      render();
      return;
    }

    if (key.name === "space") {
      const agent = agents[cursor];
      if (selected.has(agent)) {
        selected.delete(agent);
      } else {
        selected.add(agent);
      }
      message = "";
      render();
      return;
    }

    if (key.name === "a") {
      toggleAll();
      message = "";
      render();
      return;
    }

    if (key.name === "q" || key.name === "escape") {
      selected.clear();
      cleanup();
      process.exit(1);
    }

    if (key.name === "return" || key.name === "enter") {
      if (selected.size === 0) {
        message = "Select at least one agent before confirming.";
        render();
        return;
      }
      const chosen = agents.filter((agent) => selected.has(agent));
      cleanup();
      process.stdout.write(`Selected agents: ${chosen.join(", ")}\n`);
      resolvePromise(chosen);
    }
  }

  let resolvePromise;
  const result = await new Promise((resolve) => {
    resolvePromise = resolve;
    process.stdin.on("keypress", onKeypress);
    render();
  });

  return result;
}
