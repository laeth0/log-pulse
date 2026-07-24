# Log Pulse

## CI/CD

The project uses GitHub Actions:

- Pull requests targeting `main` run formatting, lint, TypeScript compilation,
  and a production Docker image build.
- Pushes to `main` repeat the application validation and publish the image to
  `ghcr.io/<repository-owner>/<repository-name>` with `latest` and commit SHA
  tags.
- Git tags beginning with `v` publish the matching version tag and commit SHA
  tag.
- Both workflows can also be started manually from the GitHub Actions page.

The delivery workflow authenticates with GitHub's automatically provided
`GITHUB_TOKEN`, so no registry password secret is required. In the repository
settings, GitHub Actions must have permission to write packages.

The pipeline intentionally does not execute tests. It validates only the source
format, lint rules, compilation, and Docker build.

To pull the latest published image:

```bash
docker pull ghcr.io/<repository-owner>/<repository-name>:latest
```

## Log retention

An hourly background job removes logs whose event timestamp is older than the
configured retention window. Cleanup uses short, bounded delete statements with
`FOR UPDATE SKIP LOCKED`, allowing ingestion to continue while expired rows are
removed. A PostgreSQL advisory lock ensures that only one application replica
runs cleanup at a time.

| Environment variable        | Default | Description                               |
| --------------------------- | ------: | ----------------------------------------- |
| `LOG_RETENTION_ENABLED`     |  `true` | Enables or disables automatic cleanup.    |
| `LOG_RETENTION_DAYS`        |    `30` | Number of days that logs are retained.    |
| `LOG_RETENTION_BATCH_SIZE`  |  `1000` | Maximum rows deleted by one statement.    |
| `LOG_RETENTION_MAX_BATCHES` |    `10` | Maximum delete statements per hourly run. |

Invalid retention values stop the application during startup rather than
silently running with an unintended policy. If more expired rows remain after a
run reaches its batch limit, the next hourly run continues the cleanup.
