/** Keep an immutable editing baseline; send only changed fields with versions. */
export class ReportEditSession {
  private baseline: Record<string, any>;
  private pending: Promise<void> = Promise.resolve();
  constructor(data: Record<string, any>, private versions: Record<string, string>) {
    this.baseline = JSON.parse(JSON.stringify(data));
  }

  save(data: Record<string, any>, write: (payload: any) => Promise<{ fieldVersions: Record<string, string> }>) {
    const snapshot = JSON.parse(JSON.stringify(data));
    const operation = this.pending.catch(() => {}).then(() => this.writeChanges(snapshot, write));
    this.pending = operation;
    return operation;
  }

  private async writeChanges(snapshot: Record<string, any>, write: (payload: any) => Promise<{ fieldVersions: Record<string, string> }>) {
    const changes: Record<string, any> = {};
    const expected: Record<string, string> = {};
    for (const key of Object.keys(snapshot)) {
      if (JSON.stringify(snapshot[key]) !== JSON.stringify(this.baseline[key])) {
        changes[key] = snapshot[key];
        expected[key] = this.versions[key];
      }
    }
    if (!Object.keys(changes).length) return;
    const result = await write({ changes, expected });
    // Only advance fields this save wrote. Other users' untouched fields must
    // retain their old baseline/version so later edits still detect conflicts.
    for (const key of Object.keys(changes)) {
      this.baseline[key] = snapshot[key];
      this.versions[key] = result.fieldVersions[key];
    }
  }
}
