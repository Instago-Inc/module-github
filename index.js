// github@latest - minimal helper for creating GitHub issues
// API:
//   configure({ token?, owner?, repo?, baseUrl?, userAgent?, repoUrl? })
//   createIssue({ owner?, repo?, title, body?, labels?, assignees?, milestone?, token? })
//   updateIssue({ owner?, repo?, number, title?, body?, state?, labels?, assignees?, milestone?, token? })
//   closeIssue({ owner?, repo?, number, token? })
//   addComment({ owner?, repo?, number, body, token? })
//   listIssues({ owner?, repo?, state?, labels?, page?, per_page?, since?, sort?, direction?, includePullRequests?, token? })
//   listIssues({ owner?, repo?, state?, labels?, page?, per_page?, since?, sort?, direction?, includePullRequests?, token? })

(function(){
  const http = require('http@latest');
  const log = require('log@latest').create('github');

  const cfg = {
    token: null,
    owner: null,
    repo: null,
    repoUrl: null,
    baseUrl: 'https://api.github.com',
    userAgent: 'hgi-v8/1.0'
  };

  function configure(opts){
    if (!opts || typeof opts !== 'object') return;
    if (opts.token) cfg.token = String(opts.token).trim();
    if (opts.owner) cfg.owner = String(opts.owner).trim();
    if (opts.repo) cfg.repo = String(opts.repo).trim();
    if (opts.repoUrl) cfg.repoUrl = String(opts.repoUrl).trim();
    if (opts.baseUrl) cfg.baseUrl = String(opts.baseUrl).replace(/\/$/, '');
    if (opts.userAgent) cfg.userAgent = String(opts.userAgent).trim();
  }

  function pickToken(override){
    return (override && String(override).trim()) ||
      cfg.token ||
      sys.env.get('github.token') ||
      null;
  }

  function parseRepoUrl(val){
    if (!val || typeof val !== 'string') return null;
    const cleaned = val.trim().replace(/\.git$/, '');
    const match = cleaned.match(/github\.com[:\/]([^\/]+)\/([^\/]+)$/i);
    if (match && match[1] && match[2]) return { owner: match[1], repo: match[2] };
    return null;
  }

  function pickRepo(owner, repo){
    const resolved = {
      owner: owner || cfg.owner || sys.env.get('github.owner') || null,
      repo: repo || cfg.repo || sys.env.get('github.repo') || null
    };
    if (!resolved.owner || !resolved.repo) {
      const parsed = parseRepoUrl(owner && repo ? null : (cfg.repoUrl || sys.env.get('github.repoUrl')));
      if (parsed) {
        if (!resolved.owner) resolved.owner = parsed.owner;
        if (!resolved.repo) resolved.repo = parsed.repo;
      }
    }
    return resolved;
  }

  function buildQuery(params){
    const parts = [];
    Object.keys(params || {}).forEach((key) => {
      const value = params[key];
      if (value === undefined || value === null || value === '') return;
      parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    });
    return parts.length ? '?' + parts.join('&') : '';
  }

  function requireIssueNumber(number, context){
    const n = Number(number);
    if (!Number.isFinite(n) || n <= 0) return { ok:false, error: context + ': invalid issue number' };
    return { ok:true, number: n };
  }

  async function createIssue({ owner, repo, title, body, labels, assignees, milestone, token } = {}){
    const authToken = pickToken(token);
    const repoInfo = pickRepo(owner, repo);

    if (!authToken) return { ok:false, error:'github.createIssue: missing token' };
    if (!repoInfo.owner || !repoInfo.repo) return { ok:false, error:'github.createIssue: missing owner/repo' };

    const trimmedTitle = String(title || '').trim();
    if (!trimmedTitle) return { ok:false, error:'github.createIssue: missing title' };

    const base = (cfg.baseUrl || 'https://api.github.com').replace(/\/$/, '');
    const url = base + '/repos/' + encodeURIComponent(repoInfo.owner) + '/' + encodeURIComponent(repoInfo.repo) + '/issues';

    const payload = { title: trimmedTitle };
    if (typeof body === 'string') payload.body = body;
    if (Array.isArray(labels) && labels.length) payload.labels = labels.map(l => String(l));
    if (Array.isArray(assignees) && assignees.length) payload.assignees = assignees.map(a => String(a));
    if (milestone != null) payload.milestone = Number(milestone);

    try {
      const res = await http.json({
        url,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + authToken,
          'User-Agent': cfg.userAgent || 'hgi-v8',
          'Accept': 'application/vnd.github+json'
        },
        bodyObj: payload
      });
      const { status, json, raw } = res || {};
      if (status >= 200 && status < 300) {
        log.info('createIssue:ok', { status, number: json && json.number, html_url: json && json.html_url });
        return { ok:true, data: json || raw };
      }
      const errPayload = {
        status,
        body: raw,
        request: {
          url,
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          labels: payload.labels,
          assignees: payload.assignees,
          milestone: payload.milestone
        }
      };
      log.error('createIssue:fail', errPayload);
      return { ok:false, error: raw || ('github.createIssue: unexpected status ' + status), details: errPayload };
    } catch (err){
      log.error('createIssue:error', err && (err.message || err));
      return { ok:false, error: (err && (err.message || String(err))) || 'unknown' };
    }
  }

  async function listIssues({
    owner,
    repo,
    state,
    labels,
    page,
    per_page,
    since,
    sort,
    direction,
    includePullRequests,
    token
  } = {}){
    const authToken = pickToken(token);
    const repoInfo = pickRepo(owner, repo);
    if (!authToken) return { ok:false, error:'github.listIssues: missing token' };
    if (!repoInfo.owner || !repoInfo.repo) return { ok:false, error:'github.listIssues: missing owner/repo' };

    const base = (cfg.baseUrl || 'https://api.github.com').replace(/\/$/, '');
    const query = buildQuery({
      state,
      labels: Array.isArray(labels) ? labels.join(',') : labels,
      page,
      per_page,
      since,
      sort,
      direction
    });
    const url = base + '/repos/' + encodeURIComponent(repoInfo.owner) + '/' + encodeURIComponent(repoInfo.repo) + '/issues' + query;
    try {
      const res = await http.json({
        url,
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + authToken,
          'User-Agent': cfg.userAgent || 'hgi-v8',
          'Accept': 'application/vnd.github+json'
        }
      });
      const { status, json, raw } = res || {};
      if (status >= 200 && status < 300) {
        const arr = Array.isArray(json) ? json : [];
        const data = includePullRequests ? arr : arr.filter(item => !item || !item.pull_request);
        return { ok:true, data };
      }
      const errPayload = { status, body: raw, request: { url, owner: repoInfo.owner, repo: repoInfo.repo } };
      log.error('listIssues:fail', errPayload);
      return { ok:false, error: raw || ('github.listIssues: unexpected status ' + status), details: errPayload };
    } catch (err){
      log.error('listIssues:error', err && (err.message || err));
      return { ok:false, error: (err && (err.message || String(err))) || 'unknown' };
    }
  }

  async function updateIssue({ owner, repo, number, title, body, state, labels, assignees, milestone, token } = {}){
    const authToken = pickToken(token);
    const repoInfo = pickRepo(owner, repo);
    if (!authToken) return { ok:false, error:'github.updateIssue: missing token' };
    if (!repoInfo.owner || !repoInfo.repo) return { ok:false, error:'github.updateIssue: missing owner/repo' };
    const issueCheck = requireIssueNumber(number, 'github.updateIssue');
    if (!issueCheck.ok) return issueCheck;

    const payload = {};
    if (title !== undefined) payload.title = String(title);
    if (body !== undefined) payload.body = body == null ? null : String(body);
    if (state) payload.state = state;
    if (labels !== undefined) payload.labels = Array.isArray(labels) ? labels.map(l => String(l)) : labels;
    if (assignees !== undefined) payload.assignees = Array.isArray(assignees) ? assignees.map(a => String(a)) : assignees;
    if (milestone !== undefined && milestone !== null && milestone !== '') payload.milestone = Number(milestone);

    const base = (cfg.baseUrl || 'https://api.github.com').replace(/\/$/, '');
    const url = base + '/repos/' + encodeURIComponent(repoInfo.owner) + '/' + encodeURIComponent(repoInfo.repo) + '/issues/' + issueCheck.number;
    try {
      const res = await http.json({
        url,
        method: 'PATCH',
        headers: {
          'Authorization': 'Bearer ' + authToken,
          'User-Agent': cfg.userAgent || 'hgi-v8',
          'Accept': 'application/vnd.github+json'
        },
        bodyObj: payload
      });
      const { status, json, raw } = res || {};
      if (status >= 200 && status < 300) return { ok:true, data: json || raw };
      const errPayload = { status, body: raw, request: { url, payload } };
      log.error('updateIssue:fail', errPayload);
      return { ok:false, error: raw || ('github.updateIssue: unexpected status ' + status), details: errPayload };
    } catch (err){
      log.error('updateIssue:error', err && (err.message || err));
      return { ok:false, error: (err && (err.message || String(err))) || 'unknown' };
    }
  }

  async function closeIssue(opts = {}){
    return updateIssue(Object.assign({}, opts, { state: 'closed' }));
  }

  async function addComment({ owner, repo, number, body, token } = {}){
    const authToken = pickToken(token);
    const repoInfo = pickRepo(owner, repo);
    if (!authToken) return { ok:false, error:'github.addComment: missing token' };
    if (!repoInfo.owner || !repoInfo.repo) return { ok:false, error:'github.addComment: missing owner/repo' };
    const issueCheck = requireIssueNumber(number, 'github.addComment');
    if (!issueCheck.ok) return issueCheck;
    if (typeof body !== 'string' || !body.trim()) return { ok:false, error:'github.addComment: body is required' };

    const base = (cfg.baseUrl || 'https://api.github.com').replace(/\/$/, '');
    const url = base + '/repos/' + encodeURIComponent(repoInfo.owner) + '/' + encodeURIComponent(repoInfo.repo) + '/issues/' + issueCheck.number + '/comments';
    try {
      const res = await http.json({
        url,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + authToken,
          'User-Agent': cfg.userAgent || 'hgi-v8',
          'Accept': 'application/vnd.github+json'
        },
        bodyObj: { body }
      });
      const { status, json, raw } = res || {};
      if (status >= 200 && status < 300) return { ok:true, data: json || raw };
      const errPayload = { status, body: raw, request: { url } };
      log.error('addComment:fail', errPayload);
      return { ok:false, error: raw || ('github.addComment: unexpected status ' + status), details: errPayload };
    } catch (err){
      log.error('addComment:error', err && (err.message || err));
      return { ok:false, error: (err && (err.message || String(err))) || 'unknown' };
    }
  }

  module.exports = { configure, createIssue, updateIssue, closeIssue, addComment, listIssues };
})();

// Minimal self-test using stubbed http.json (no real network)
if (require.main === module) {
  const originalHttp = require.cache && require.cache[require.resolve('http@latest')];
  try {
    // Stub http.json
    require.cache[require.resolve('http@latest')] = {
      exports: {
        json: async (req) => ({
          status: 201,
          json: { number: 123, html_url: 'http://example.com/issue/123', request: req }
        })
      }
    };
    module.exports.configure({ token: 't', owner: 'o', repo: 'r', baseUrl: 'http://api' });
    module.exports.createIssue({ title: 'hi' }).then(res => {
      if (!res.ok || !res.data || res.data.number !== 123) throw new Error('createIssue failed');
        log.info('ok');
    }).catch(err => { console.error(err); process.exit(1); });
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    // restore cache entry if it existed
    if (originalHttp) require.cache[require.resolve('http@latest')] = originalHttp;
  }
}
