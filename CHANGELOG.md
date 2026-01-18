## v1.0.2 - Docs polish and dependency alignment
Updated the GitHub module documentation so automation authors know how repo resolution, `baseUrl`, and `userAgent` defaults work, and clarified the intent behind the embedded runtime copy for easier adoption. Refreshed the README, docs site, and embedded module comment to highlight how the packaged helper stays in sync with the latest dependency tags.

### Changed
- Reworded the README and docs/index.html copy to emphasize keeping GitHub issue actions close to automation and spelled out new configuration notes around `configure(...)`, including the `baseUrl` and `userAgent` overrides.
- Updated `index.js` comments and stubbed dependency references to use the latest tags so the module description matches the published packaging.

## v1.0.1 - GitHub module initial release
Initial release for the Instago GitHub module, documenting the earliest artifacts that let consumers install and explore the package. The entry highlights the availability of the module and the baseline files that ship with it.

### Added
- Introduced the Instago GitHub module with the published package metadata, README, license, and entry-point bundle for future integrations.
