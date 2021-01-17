# The Suite

The suite is a collection of tightly integrated small (even micro) services.

I was tired of both maintaining a huge number of dependencies, as well as rewriting every single piece of code. 
Therefore this repository "reinvents all the wheels" except for large, well maintained dependencies (Express, React).
All services share a common architecture, theme and utilities that can be found in `src/shared`.
In `src/repl` common CLI interfaces for administration and setup can be found.

In the most simple setup, all services just run as NodeJS processes on one instance. However through the loose coupling (services talk through APIs) it is possible to run each service in it's own container and scale out if needed.

To simplify administration, The Suite assumes to be running on one PostgreSQL instance. However to harden database access, each service uses a different account with different privileges.

# Services

## Login - A Single Sign On Provider

The login service serves as a single sign-on provider for the suite, such that accounts, login methods and authorizations reside in one place, and switching between applications is seamless.

Current features:
- Single Sign On throughout the Suite
- User administration via CLI

Planned Features:
- Better error handling
- Frontend for managing users
- WebAuthn support
- OpenID Connect IDP

## Family - A place to keep your families history

Current Features:

Planned Features:
- Add people
- Link people through child / marriage relationships
- Upload photos
# Setup

# Future Ideas

-> Migrate to Deno? This would be a good candidate for early adoption, and only few dependencies to Node exist (atm). 
-> Docker containers?
