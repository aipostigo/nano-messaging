# nano-messaging

*Nano Messaging* es una PoC para un sistema de mensajería basado en la arquitectura *pub/sub* para una pequeña startup. Funciona mediante *websockets* y una instancia de redis para coordinar los mensajes

Dado que es una prueba de concepto, el código está desordenado y no es tan descriptivo, ademas de no ser 100% infalible. Parte del desafío para usar este código bien es entender la arquitectura y las implicancias de las decisiones que se hicieron en esta PoC, y mejorarlo/completarlo.

Si lo desean, pueden hacer un PR a la rama dev de este *chat*, y proponer alguna mejora o funcionalidad para futuras instancias de este curso.

El diagrama se puede encontrar en `/docs/nano-messaging-components.png`

## Features

* Sistema de mensajes escalable en base a *pub/sub*
* Historial de mensajes
* Manejo de *chats* en base a *rooms*
* Manejo de usuarios en base a UUID
* Solamente requiere un JWT firmado para funcionar

## Stack

* Webserver: Koa
* Broker: Redis
* Base de datos de *chats* y *rooms*: Postgres
* Containers: Docker

## Overview

Este sistema ofrece *rooms* para que diversos usuarios conversen en un *chat*.

Cada *room* puede ser accedido por usuarios y entidades, las cuales representan grupos.

Existe una tabla de permisos para cada *room*, especificando que cosas pueden hacer los usuarios y entidades en cada *room*, si están aceptados y que nivel tienen en el *room*. Estos *rooms* tienen dos propietarios: un usuario específico y una entidad a la que este pertenece. 

Así entonces, un usuario puede entrar por su propio mérito, o a causa de algún grupo que lo autorizó.

## Setup

### Variables de entorno

Es necesario crear dos archivos de variables de entorno en la base del proyecto:

* `.env`
* `.env_db`

(hay ejemplos en `./docs/example_environment.env`)

### Docker

Utilizar Docker Compose para levantar la app:

```
docker compose up -d
```

Posteriormente, ejecutar las migraciones necesarias

```
docker compose exec api npx sequelize db:migrate
```

Su app está lista para utilizarse.

## Modo de uso 

### Token

Para empezar a usar el sistema, se debe ensamblar un token con la siguiente composición

```json=
{
  "aud":"chat.nano-messaging.net",
  "iss":"api.nano-messaging.net",
  "exp":"9999999999999",
  "sub":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "entityUUID":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "userUUID":"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "levelOnEntity":"100"
}
```

* `userUUID` se refiere a un usuario con capacidades de uso del *chat*, y se usará su UUID para inscribirlo en los *rooms* asi como para manejar los permisos.
* `entityUUID` se refiere a la entidad padre del usuario (tal como si el usuario perteneciera a una organización). Esto es para poder entrar a *rooms* que autorizan en base a una entidad padre común para ciertos usuarios.
* `levelOnEntity` se refiere al nivel de autorizacion asignado por el sistema de usuarios principal. Un nivel de `100` permite crear *rooms*, aunque se sugiere que esto sea cambiado a alguna autorización para crear *rooms* en especifico.
* `aud`, `iss` y `exp` tienen los significados originales en la especificación JWT ([RFC-7519](https://www.rfc-editor.org/rfc/rfc7519)). `sub` podría sustituir a `userUUID` pero no se usa.

Este token debe estar firmado con un secreto conjunto con el servicio original que provee los usuarios de este *chat*. El servicio de *chat* asumirá que la información contenida en el token es veraz. Adicionalmente, el servicio de *chat* no requiere interactuar con el servicio original, solo la información contenida en el token.

En la carpeta `./scripts` se encuentra el archivo `createJWT.js` que contiene un ejemplo para crear un token válido. Requiere usar el mismo `.env` que existe en la base del proyecto (específicamente, usar el mismo *secreto*, *audience* e *issuer*).

### Rooms

Se debe crear un *room* para que los usuarios puedan hablar:

`POST /rooms`

```json=
{
  "name":"xxxxxxxxxxxx",
  "level_admin":"999",
  "type":"group"
}
```

Donde `name` define el nombre del *room*, `level_admin` el nivel necesario para modificar el *room* y sus permisos y `type` el tipo de *room* (no implementado, pero puede ser `group` para *rooms* multiusuario, y `user2user` para *rooms* de máximo dos personas).

Posteriormente puede invitar mas miembros añadiendolos mediante una regla en la tabla de permisos. Use un `PUT` para añadir esta regla, o modificar reglas anteriores

`PUT /rooms/:id/members`

```json=
{
  "userUUID":"",
  "permissions":"rw",
  "level":100
}
```

`entity_UUID` se refiere al UUID al que se quiere autorizar. `permissions` es un string definiendo permisos (use `"rw"` como permiso estándar)

```
 * r = read
 * w = write
 * b = banned
 * a = admin
```

Y `level` da el nivel de acceso para esa entidad. Nótese que cada entidad puede representar un usuario o una entidad arbitraria.
*Más de `10` reglas genera un error, aunque este es un límite arbitrario.

### Chatear

Para usar el *chat*, un usuario debe **abrir un *websocket* en la ruta `/chat`**. Este *websocket* funciona en base a un sistema de órdenes usando una estructura JSON. El sistema responderá `START?` al comenzar.

1. Para comenzar, debe **enviar el token** especificado anteriormente en un mensaje:

```json=
{
  "type":"token",
  "content":"token.jwt.secreto"
}
```

Un token firmado correctamente responderá `READY` (dentro de un JSON) y uno incorrecto `TOKEN?`. Muchos intentos incorrectos originan un error `BADAUTH`.

2. Posteriormente, se debe **seleccionar un *room* activo**:

```json=
{
  "type":"select_room",
  "room_id":99999
}
```

Al seleccionar un *room* correcto, recibirá todos los mensajes dirigidos a ese *room*, así como enviar mensajes.

3. Para **enviar un mensaje**, se debe utilizar el siguiente formato:

```json=
{
  "type":"message",
  "content":"Fueled up and ready to go"
}
```

Recibirá el echo de sus propios mensajes.
Cada mensaje llegará

### Historial de mensajes

Para ver el historial de mensajes entre dos fechas se necesita el `id` del *room* a buscar y el token de un usuario que al menos tenga permisos de lectura (`"r"`) sobre ese *chat*:

`GET /rooms/:id/messages`

También se puede filtrar el historial:

`GET /rooms/:id/messages?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD`

Donde `dateFrom` y `dateTo` son opcionales. En caso de no ingresar alguno, su valor predeterminado será el día actual.

### Estructura

```
├── README.md - Este archivo
├── api
│   ├── Dockerfile - Dockerfile para staging
│   ├── Dockerfile.dev - Dockerfile para desarrollo
│   ├── index.js - Script de inicializacion
│   ├── nodemon.json - Configuracion para el modo de desarrollo
│   ├── package-lock.json - Archivo lock para consistencia de paquetes
│   ├── package.json - Descriptor de paquetes
│   ├── sonar-project.properties - Archivo para análisis Sonarqube (no usado)
│   └── src
│       ├── app.js - Código principal de la aplicación
│       ├── config - Configuraciones de la base de datos
│       │   └── database.js
│       ├── migrations
│       ├── models
│       │   ├── index.js
│       │   ├── message.js
│       │   ├── room.js
│       │   └── room_permission.js
│       ├── routes
│       │   ├── chat.js
│       │   ├── index.js
│       │   ├── messages.js
│       │   └── rooms.js
│       └── routes.js
└── docker-compose.yml - Compose para desarrollo

```

### By
Dynaptics