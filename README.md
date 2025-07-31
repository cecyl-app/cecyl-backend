# Cecyl Backend

## Requirements:

Create a `envs` folder with the following file:

- `app.env`
    ```properties
    OPENAI_API_KEY=secret-openai-api-key
    DB_CONN_STRING=mongodb://mongouser:password@db:27017/cecyldb?authSource=admin
    OPENAI_MODEL=gpt-4o-mini
    ```
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

## Run

Run the server with:

```bash
make up
```