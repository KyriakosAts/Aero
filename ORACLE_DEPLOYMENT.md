# Oracle VM Deployment

This guide is for running the full application directly on an Oracle Cloud Ubuntu VM.

It uses the repository root `Dockerfile`, which builds the frontend and serves it from the same FastAPI container as the backend.

## 1. Oracle Networking

Using your existing VCN and existing subnet is fine.

For this app, you only need:

- a public IPv4 on the instance
- TCP `22` open for SSH
- TCP `80` open for the app

If you want to test first without using port `80`, you can open TCP `8000` and deploy on that instead.

## 2. SSH Into The VM

Once your SSH key issue is fixed, connect with:

```bash
ssh -i ~/.ssh/oracle.key ubuntu@YOUR_PUBLIC_IP
```

If you are using Windows PowerShell directly, use your Windows key path instead.

## 3. Clone The Repository

On the Oracle VM:

```bash
sudo apt update
sudo apt install -y git
git clone https://github.com/KyriakosAts/Aero.git
cd Aero
```

## 4. Prepare The Host

Make the helper scripts executable and install host dependencies:

```bash
chmod +x scripts/oracle/*.sh
bash scripts/oracle/install-host.sh
```

What this script does:

- installs Docker
- enables the Docker service
- adds your user to the Docker group
- creates a swap file by default, which helps on smaller Oracle free-tier instances

Optional environment variables:

```bash
SWAP_SIZE_GB=6 bash scripts/oracle/install-host.sh
ENABLE_SWAP=false bash scripts/oracle/install-host.sh
```

## 5. Deploy The App

The easiest production path is to expose the app directly on port `80`:

```bash
HOST_PORT=80 bash scripts/oracle/deploy-fullstack.sh
```

If you prefer to test first on port `8000`:

```bash
HOST_PORT=8000 bash scripts/oracle/deploy-fullstack.sh
```

This script:

- builds the root Docker image
- removes any old container with the same name
- starts the app container with `--restart unless-stopped`
- waits for `http://127.0.0.1:<port>/api/health` to pass

After the script finishes, open:

- `http://YOUR_PUBLIC_IP/` if you used port `80`
- `http://YOUR_PUBLIC_IP:8000/` if you used port `8000`

## 6. Check Health

Run:

```bash
HOST_PORT=80 bash scripts/oracle/check-health.sh
```

Or if you deployed on port `8000`:

```bash
HOST_PORT=8000 bash scripts/oracle/check-health.sh
```

Container logs:

```bash
sudo docker logs -f aero
```

## 7. Update The Deployment Later

When you want the latest GitHub changes on the VM:

```bash
bash scripts/oracle/update-fullstack.sh
```

If you need a different branch:

```bash
BRANCH=main bash scripts/oracle/update-fullstack.sh
```

## 8. Current Application Scope

Hosting on Oracle solves the infrastructure problem, but it does not change the current backend implementation scope.

At the moment:

- the live `turbojet` preset is wired to a real backend model
- some other engine options shown in the UI are not yet fully wired to live models
- the Custom Builder is still not connected to the live solver

So Oracle gives you a real hosted backend, but not every UI flow is fully live yet.

## 9. Quick Start Summary

If SSH is already working, these are the minimum commands:

```bash
sudo apt update && sudo apt install -y git
git clone https://github.com/KyriakosAts/Aero.git
cd Aero
chmod +x scripts/oracle/*.sh
bash scripts/oracle/install-host.sh
HOST_PORT=80 bash scripts/oracle/deploy-fullstack.sh
```
