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
