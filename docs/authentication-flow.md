# SothForge API - Authentication Flow

## 1. Objetivo

Documentar el flujo de autenticacion del sistema usando JWT, Refresh Tokens y control de acceso por guards.

## 2. Flujo de registro

1. El cliente envía una solicitud POST /auth/register con username, email y password.
2. El sistema valida los datos de entrada.
3. Se genera el hash de la contrasena con bcrypt.
4. Se crea el usuario en la base de datos.
5. Se devuelve una respuesta de exito.

## 3. Flujo de login

1. El cliente envía POST /auth/login con email y password.
2. El sistema valida las credenciales.
3. Si son validas, genera un Access Token y un Refresh Token.
4. Se devuelve la respuesta con ambos tokens.

## 4. Flujo de acceso protegido

1. El cliente envía el Access Token en el header Authorization.
2. El guard JWT valida el token.
3. Si es valido, la solicitud continua.
4. Si no es valido, se devuelve 401 Unauthorized.

## 5. Flujo de refresh token

1. El cliente envía el Refresh Token al endpoint /auth/refresh.
2. El sistema valida el refresh token.
3. Si es valido, emite un nuevo Access Token.
4. Opcionalmente, emite un nuevo Refresh Token si se desea rotacion.

## 6. Flujo de logout

1. El cliente solicita /auth/logout.
2. El sistema invalida el refresh token o lo agrega a una blacklist.
3. El usuario queda desautenticado para futuras sesiones.

## 7. Consideraciones de seguridad

- Los secretos deben guardarse en variables de entorno.
- Los tokens deben expirar en tiempo definido.
- Los refresh tokens deben manejarse con cuidado para evitar uso indebido.
- Los endpoints sensibles deben estar protegidos por guards.
