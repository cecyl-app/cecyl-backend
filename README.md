# Cecyl Backend

## VM Config

The VM can be configured using the `cloud-init.yaml` file. You can install it in one of the following ways:

- Copy in the cloud-init section during VM startup, but remember to replace the `{{WEBHOOK_SECRET}}` placeholder with the same secret `DEPLOY_WEBHOOK_SECRET` used in the Github Action. OR
- Execute it after the VM is already up and running.
    1. Run
        ```bash
        mkdir .vm_init
        cd .vm_init
        touch 60-init.yaml
        ```
        and copy the content of `cloud-init.yaml` inside `60-init.yaml`.
    1. Create a file called `webhook.secret` containing the secret `DEPLOY_WEBHOOK_SECRET` used in the Github Action.
    1. Run
        ```bash
        sed -i "s/{{WEBHOOK_SECRET}}/$(cat webhook.secret)/" 60-init.yaml
        ```
        To replace the webhook secret placeholder with the actual value
    1. Run
        ```bash
        cloud-init clean
        cloud-init single --file ./60-init.yaml --name cc_package_update_upgrade_install
        cloud-init single --file ./60-init.yaml --name cc_write_files
        cloud-init single --file ./60-init.yaml --name cc_runcmd
        bash -x /var/lib/cloud/instances/*/scripts/runcmd
        ```

---

## Github Action Config

The configured Github Action requires the following repository secrets:

- `DEPLOY_WEBHOOK_URL`: url of the webhook for the deployment. Set it to: `http://{{yourserver}}:9000/hooks/deploy`, where `{{yourserver}}` refers to the ip/domain of your server.
- `DEPLOY_WEBHOOK_SECRET`: secret that must match the one used by the webhook server

---

## Requirements:

Create a `envs` folder with the following file:

- `app.env`
    ```properties
    OPENAI_API_KEY=secret-openai-api-key
    OPENAI_MODEL=gpt-5

    DB_CONN_STRING=mongodb://mongouser:password@db:27017/cecyldb?authSource=admin

    GOOGLE_AUTH_CLIENT_ID=client-id-from-https://console.cloud.google.com/auth/clients
    GOOGLE_AUTH_ALLOWED_EMAILS=name1@gmail.com,name2@gmail.com
    ```

    **Note**: `GOOGLE_AUTH_ALLOWED_EMAILS` specifies the comma-separated emails that are allowed
    to access the APIs
- `db.env`
    ```properties
    MONGO_INITDB_ROOT_USERNAME=mongouser
    MONGO_INITDB_ROOT_PASSWORD=password
    MONGO_INITDB_DATABASE=cecyldb
    ```

While developing, create an additional file for the `mongo-express` service:

`mongo-express.env`
```properties
ME_CONFIG_MONGODB_URL=mongodb://mongouser:password@db:27017/cecyldb?authSource=admin
ME_CONFIG_MONGODB_ADMINUSERNAME=mongouser
ME_CONFIG_MONGODB_ADMINPASSWORD=password
ME_CONFIG_BASICAUTH=false
ME_CONFIG_BASICAUTH_USERNAME=
ME_CONFIG_BASICAUTH_ENABLED=false
```

Next you need to create a session secret key, used to secure the session cookie created. Run:

```bash
make init
```

It should create a `.key` file in `./app-data/`.

---

## Run

Run the server with:

```bash
make up
```

you can specify a custom port for the web server with `APP_PORT` (default: 3000):

```bash
make up APP_PORT=2345
```
