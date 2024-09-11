# Authentication

The authentication mode is defined by the `AUTH` environment variable which is set in the `variables/<env>.env` file.

Currently, the valid options are `single_user` and `IAP`

## Single user mode

By default, Sophia runs in a single user mode which disables any authentication. On startup the database is queried for
a user profile, and if none is found then creates one, using the email from the `SINGLE_USER_EMAIL` environment variable.

Th