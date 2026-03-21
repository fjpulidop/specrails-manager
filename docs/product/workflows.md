# Workflows

Step-by-step guides for the most common tasks in specrails-hub.

---

## 1. Implement a new feature

Use this workflow when you want to implement a GitHub issue or a new feature.

**Prerequisites:** Hub running, project registered, project has specrails-core installed.

### Option A: From the dashboard

1. **Open the dashboard** at `http://127.0.0.1:4200`
2. **Select your project** from the tab bar
3. **Click Implement** in the DELIVERY section of the CommandGrid
4. **Fill in the wizard** — enter the issue number or a description
5. **Monitor the pipeline** — the Dashboard shows the active phase in real-time:
   ```
   Architect → Developer → Reviewer → Ship
   ```
6. **Watch logs** — the log panel streams Claude's output as it runs
7. **Review results** — the job entry in the Recent Jobs table shows the exit code, duration, and token cost

### Option B: From the CLI

```bash
cd ~/repos/my-app
specrails-hub implement "#42"
```

---

## 2. Batch implementation (multiple issues)

Use this when you have several independent issues to implement.

### From the dashboard

1. Click **Batch Implement** in the DELIVERY section
2. Enter a list of issue numbers in the wizard
3. Each issue becomes a separate job, visible in Recent Jobs

### From the CLI

```bash
specrails-hub batch-implement "#40" "#41" "#43"
```

Jobs run concurrently (subject to system resources). Monitor all jobs in the Dashboard.

---

## 3. Implement using OpenSpec artifacts

Use this when you have created OpenSpec change artifacts (`opsx:new` or `opsx:ff`) and want to apply them.

> All `opsx:*` commands run from the CLI inside your project directory. The job queues in the hub and is visible in the Dashboard.

```bash
cd ~/repos/my-app

# 1. Create the change and generate all artifacts
specrails-hub /opsx:ff

# 2. Implement using the artifacts
specrails-hub /opsx:apply

# 3. Verify the implementation matches the spec
specrails-hub /opsx:verify

# 4. Archive the change
specrails-hub /opsx:archive
```

See [OpenSpec Workflow](openspec-workflow.md) for the full command reference.

---

## 4. Use the Chat panel

The Chat panel lets you talk to Claude in the context of the active project — useful for asking questions about the codebase, debugging, or planning.

### Steps

1. The chat sidebar is always visible in the project layout — no navigation needed.
2. Type your message and press Enter.
3. Claude responds with the project directory as its working context.

**Available slash commands in chat:**

| Command | What it does |
|---------|--------------|
| `/sr:implement #42` | Start an implementation job for issue #42 |
| `/sr:propose-spec` | Propose a spec for a new feature |
| `/sr:health-check` | Run a codebase health check |
| `/sr:why` | Explain what specrails is doing |
| `/sr:refactor-recommender` | Identify refactoring opportunities |
| `/sr:compat-check` | Check for breaking API changes |

---

## 5. Add a new project

Use this when registering a new codebase with the hub.

**Option A: From the dashboard**

1. Click **+** (add project) in the tab bar.
2. Enter the absolute path to your project (e.g., `/Users/you/projects/my-app`).
3. Click **Add**.

If specrails-core is not yet installed in that project, the **Setup Wizard** launches automatically:
- Phase 1: Confirm the project path
- Phase 2: The hub proposes running `npx specrails-core`
- Phase 3: Installation runs with a live log stream
- Phase 4: A setup chat with Claude (`/setup`) configures the project
- Phase 5: Summary — the project is ready

**Option B: From the CLI**

```bash
specrails-hub add /path/to/your/project
```

Verify it was added:

```bash
specrails-hub list
```

---

## 6. Remove a project

1. Get the project ID:
   ```bash
   specrails-hub list
   ```
2. Remove it:
   ```bash
   specrails-hub remove <project-id>
   ```

This unregisters the project from the hub. It does **not** delete the project directory or its specrails-core installation.
