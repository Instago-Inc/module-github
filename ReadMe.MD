# module/github - V8 module

Create and manage GitHub issues from workflows without leaving your automation. This module wraps common issue actions so you can file, update, and discuss work in a consistent way.

It is designed for the embedded V8 runtime in this repo and is a good fit for small, reliable workflow steps. Learn more at https://instago.ai.

## Technical reference

Exports:
- `configure({ token?, owner?, repo?, baseUrl?, userAgent?, repoUrl? })`
- `createIssue({ owner?, repo?, title, body?, labels?, assignees?, milestone?, token? })`
- `updateIssue({ owner?, repo?, number, title?, body?, state?, labels?, assignees?, milestone?, token? })`
- `closeIssue({ owner?, repo?, number, token? })`
- `addComment({ owner?, repo?, number, body, token? })`
- `listIssues({ owner?, repo?, state?, labels?, page?, per_page?, since?, sort?, direction?, includePullRequests?, token? })`

Configuration:
- Optional env keys: `github.owner`, `github.repo`, `github.repoUrl`, `github.token`
- `configure(...)` overrides env values for future calls.

Usage:
- Provide a token via `configure({ token })` or per call via `token`.
- Provide repo details via `owner`/`repo`, or `repoUrl`, or env values.
- Returns `{ ok, data, error, details? }` depending on the call outcome.

Examples:
```js
const github = require('github@latest');

github.configure({
  token: env.GITHUB_TOKEN,
  owner: 'acme',
  repo: 'project'
});

const created = await github.createIssue({
  title: 'Bug report',
  body: 'Steps to reproduce...'
});

if (created.ok) {
  await github.addComment({ number: created.data.number, body: 'Thanks for the report.' });
  await github.updateIssue({ number: created.data.number, labels: ['triage'] });
}
```

```js
const github = require('github@latest');

const list = await github.listIssues({
  repoUrl: 'https://github.com/acme/project',
  state: 'open',
  labels: ['bug'],
  includePullRequests: false,
  token: env.GITHUB_TOKEN
});
```
