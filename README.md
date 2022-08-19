# Kaptilo SMTP Server

SMTP Server that traps incoming mail for use in non-productive environments.


## What is Kaptilo?

Kaptilo is a SMTP server that is not going to actually forward any email it receives.
It will store all received email in a memory or Redis storage and allow users to view then in a web page.


## Underlying technology

Kaptilo runs entirely in Node.JS and requires version 16+. Both SMTP Server and HTTP Server run together in the same process, listening on different ports (8080 and 5025, by default).

As a SMTP Server, Kaptilo uses the [Nodemailer](https://nodemailer.com/) library, specifically their extra module [SMTP Server](https://nodemailer.com/extras/smtp-server/).

For HTTP Server, Kaptilo uses [Express](https://expressjs.com/) to provide both an API that returns mail data and also a static content at root URL for a simple web page that will display the email with a UI that resembles an online email client.


## Running the server

Kaptilo only needs a Node.JS instalation to be run. The simplest way to run it is just clone the repository and then run it.

```sh
git clone https://github.com/dlmorais-13/kaptilo-smtp-server.git
cd kaptilo-smtp-server
node index.js
```

### Using Docker

It's also possible to run it using the provided container image.

```sh
docker run -p 8080:8080 -p 5025:5025 dlmorais/kaptilo
```


## Configuring the server

All available options can be defined using environment variables.

<table>
  <thead>
    <tr>
      <th>Variable</th>
      <th>Type</th>
      <th>Default</th>
      <th>Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>HTTP_IP</td><td>string</td><td><code>'0.0.0.0'</code></td>
      <td>IP for the HTTP server to listen on.</td>
    </tr>
    <tr>
      <td>HTTP_PORT</td><td>number</td><td><code>8080</code></td>
      <td>Port used by the HTTP server.</td>
    </tr>
    <tr>
      <td>SMTP_IP</td><td>string</td><td><code>'0.0.0.0'</code></td>
      <td>IP for the SMTP server to listen on.</td>
    </tr>
    <tr>
      <td>SMTP_PORT</td><td>number</td><td><code>5025</code></td>
      <td>Port used by the SMTP server.</td>
    </tr>
    <tr>
      <td>SMTP_OPT_*</td><td>*</td><td></td>
      <td>Defines an option to the underlying SMTP server. Any variable name starting with `SMTP_OPT_` will have this prefix striped and the remaining of its name "camelCased". The options  are passed directly to SMTP server construtor.
      <br>
      The list of the options can be found in Nodemailer's SMTP Server docs. (<a href="https://nodemailer.com/extras/smtp-server/" target="_blank" rel="noopener noreferrer">link</a>)</td>
    </tr>
    <tr>
      <td>MAX_ITEMS</td><td>number</td><td><code>0</code></td>
      <td>Maximum number of emails that are going to be kept in the server. If <code>0</code> no limit is applied.</td>
    </tr>
    <tr>
      <td>TTL</td><td>number</td><td><code>0</code></td>
      <td>Maximum time <b>in minutes</b> that an email will be kept in the server. If <code>0</code> no limit is applied.</td>
    </tr>
    <tr>
      <td>REDIS</td><td>string</td><td><code>undefined</code></td>
      <td>If set to <code>'true'</code>, server will use a Redis instance as storage for received emails.</td>
    </tr>
    <tr>
      <td>REDIS_CONN_STRING</td><td>string</td><td><code>'redis://localhost:6379'</code></td>
      <td>Redis connection string to be used.</td>
    </tr>
    <tr>
      <td>SMTP_AUTH_MODE</td>
      <td><code>'none'|'basic'|'ldap'</code></td>
      <td><code>'none'</code></td>
      <td>
        Authentication method used by the SMTP server.
        <br>
        If <code>'basic'</code>, then the variable <code>SMTP_AUTH_USERS</code> must also be defined.
        <br>
        If <code>'ldap'</code>, then a LDAP configuration must be defined using the variables <code>LDAP_*</code>.
      </td>
    </tr>
    <tr>
      <td>SMTP_AUTH_USERS</td>
      <td>string</td>
      <td><code>''</code></td>
      <td>
        List of the users allowed on SMTP server. It is a list of user and password pairs divided by a colon (:), separated by commas (,).
        <br>
        <i>Ex.: <code>'user01:pass01,user02:pass02'</code></i>
      </td>
    </tr>
    <tr>
      <td>LDAP_HOST</td><td>string</td><td></td>
      <td>Host of LDAP server to use for authentication.</td>
    </tr>
    <tr>
      <td>LDAP_PORT</td><td>number</td><td></td>
      <td>Port of LDAP server to use for authentication.</td>
    </tr>
    <tr>
      <td>LDAP_BIND_DN</td><td>string</td><td></td>
      <td>Distinguished Name (DN) of the user used to bind the LDAP connection.</td>
    </tr>
    <tr>
      <td>LDAP_BIND_PASSWORD</td><td>string</td><td></td>
      <td>Password of the user used to bind the LDAP connection.</td>
    </tr>
    <tr>
      <td>LDAP_SEARCH_BASE</td><td>string</td><td></td>
      <td>Base for the LDAP search when looking up for the user with the provided user id attribute.</td>
    </tr>
    <tr>
      <td>LDAP_USER_ID_ATTR</td><td>string</td><td><code>'uid'</code></td>
      <td>Attribute used by LDAP server as user ID. Usually is <code>'uid'</code> for OpenLDAP servers and <code>'sAMAccountName'</code> for Microsoft Active Directory (MS-AD)</td>
    </tr>
    <tr>
      <td>LDAP_SEARCH_SCOPE</td>
      <td><code>'base'|'sub'</code></td>
      <td><code>'sub'</code></td>
      <td>
        Scope of the search to be performed, in relation of the search base.
        <br>
        If <code>'base'</code>, will lookup for users that are registered exactly on the search base.
        <br>
        If <code>'sub'</code>, will lookup for any user that is registered on the search base and any directory below it.
      </td>
    </tr>
  </tbody>
</table>

