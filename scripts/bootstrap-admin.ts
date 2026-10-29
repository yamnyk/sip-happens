/**
 * One-off: create the first admin. Run with `pnpm bootstrap-admin`.
 * Prompts for nick and password interactively (password input is not echoed and never touches shell history).
 */
import readline from "node:readline";
import { Writable } from "node:stream";
import { nickToEmail, validateNick } from "../src/lib/nick";
import { passwordSchema } from "../src/lib/schemas";
import { getAdminClient } from "../server/supabase-admin";

function ask(question: string, hidden = false): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding);
      callback();
    },
  });
  const rl = readline.createInterface({
    input: process.stdin,
    output,
    terminal: true,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    });
    // Mute only after the prompt text was written.
    muted = hidden;
  });
}

function die(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  if (!process.stdin.isTTY)
    die("This script needs an interactive terminal (hidden password input).");

  const client = getAdminClient();

  const existing = await client
    .from("profiles")
    .select("id")
    .eq("is_admin", true)
    .limit(1);
  if (existing.error)
    die(`Could not check for existing admins: ${existing.error.message}`);
  if ((existing.data?.length ?? 0) > 0)
    die("An admin already exists. Refusing to create another.");

  const nick = (await ask("Admin nick: ")).trim();
  const nickError = validateNick(nick);
  if (nickError) die(`Invalid nick: ${nickError}`);

  const password = await ask("Password (min 8, hidden): ", true);
  const passwordCheck = passwordSchema.safeParse(password);
  if (!passwordCheck.success)
    die("Invalid password: must be 8 to 72 characters.");
  const again = await ask("Repeat password: ", true);
  if (again !== password) die("Passwords do not match.");

  const created = await client.auth.admin.createUser({
    email: await nickToEmail(nick),
    password,
    email_confirm: true,
    user_metadata: { nick },
  });
  if (created.error || !created.data.user) {
    die(
      `Could not create the user: ${created.error?.message ?? "unknown error"}`,
    );
  }
  const userId = created.data.user.id;

  const promoted = await client
    .from("profiles")
    .update({ is_admin: true })
    .eq("id", userId);
  if (promoted.error) {
    await client.auth.admin.deleteUser(userId);
    die(
      `Could not set the admin flag (user rolled back): ${promoted.error.message}`,
    );
  }

  console.log(`Admin "${nick}" created. You can log in now.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Unexpected error");
  process.exit(1);
});
