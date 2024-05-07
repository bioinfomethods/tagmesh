# TagMesh

TagMesh is a library to enable easy and simple collaboration across
different projects by allowing tags and notes to be added to arbitrary
entities and then shared across projects.

This library is the core library that provides base level support that is
independent of any user interface library or framework. In practice, you will
probably want to also install a UI support library so that TagMesh
works seamlessly (either Vue, or React).

## Building

TagMesh is built using Node v20.x. First ensure that you have this 
installed before proceeding.

Then you can build it as a regular NPM package:

```
npm install
npm run build && npm pack
```

To actually use TagMesh, refer to one of the UI support libraries, such as
[tagmesh-vue2](tagmesh-vue2).

## TagMesh Server

While TagMesh works when used only as a client library, this then causes your
tags and annotations to be stored only in the user's browser local storage. To
enable persistent storage, they must be connected via Couch replication 
to an online CouchDB database.

The `server` directory contains a docker-compose file that allows you to run
a compatible CouchDB server. Once you do this, you can add a call to the
`TagRepository.connect` function in your client application.

Although in theory you can connect to "vanilla" CouchDB, to achieve a
practically workable security model, it is better to place Nginx in front
of CouchDB and proxy requests through. This is also included and configured
by the provided [docker-compose.yml](https://gitlab.com/ssadedin/tagmesh/-/blob/main/server/docker-compose.yml) file.


### Running the server

To run the server, just run:

```
cd server
docker-compose up -d
```

Check the logs:

```
docker-compose logs --follow
```

### Setting admin password

The default setup uses user `admin` and a default password of 
of `couchdb`.  **You must change this yourself to have a 
secure configuration!**. To do this, create a
`.env` file with values for the admin password and its
base64 encoded form. For example:

```bash
COUCHDB_ADMIN_PASSWORD=supersecret
COUCHDB_ADMIN_PASSWORD_ENC=YWRtaW46c3VwZXJzZWNyZXQ=
```

The encoded form should be exactly as is required when the password is passed
in Basic authorization in the HTTP Authorization header. An example of calculating
the value for the password `supersecret` is:

```
echo -n 'admin:supersecret' | openssl base64
```

**IMPORTANT** : Due to how security is configured, to do this first login, 
you will need to edit the default `config/pouchdb/docker.ini` file and comment 
out the line:

```
require_valid_user_except_for_up = true
```

Note that after first run of the server, CouchDB will write a line for the
admin user into this configuration file, and after that is written, changes to the
admin user or password won't take effect unless you first remove the line.

## CORS

By default, CORS is enabled within CouchDB for all hosts. If you know the 
location from which clients will be connecting, you should edit the file in:

```
config/pouchdb/docker.ini
```

In there, set the value of `origins` to that host name, or disable it if it
altogether if it is not needed. Note that because CouchDB interaction does not
use cookies or default headers, it does not directly expose a CORS risk in the
same way that regular session based authentication would. Nonetheless, it is
best practice to restrict the origins of requests if you can.

### Adding users

The default security model is to use native built in CouchDB users. This requires
you to set up all users who may access the database and their passwords
inside the database. You might do this, for example, using the CouchDB admin tool,
or using `curl` to put users into the database. An example curl command that puts
a user into the database looks like:

```bash
curl -X PUT http://admin:couchdb@127.0.0.1:5984/_users/org.couchdb.user:john \
     -H "Content-Type: application/json" \
     -d '{"type": "user", "name": "john", "password": "password", "roles": []}'
```

### Client setup

The Nginx configuration places all CouchDB paths under a top level path of `/db`
which allows you to then map other paths separately, for example, to serve your
web pages or connect to other application features. This means that in your
client application, you should pass in a CouchDB URL looking something like
`http://<your server>:5288/db`.

Then, your client will connect to the database using code such as:

```
    async connectTagMesh() {
      let tags = await TagRepository.create(this.subject, this.tag_source)
      const couchURL = 'http://localhost:5288/db',
      tags.connect(couchURL, "john","password")
      return tags
    }
```

