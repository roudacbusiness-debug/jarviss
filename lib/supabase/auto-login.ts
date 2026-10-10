import "server-only";

/**
 * Connexion automatique : l'application est à usage strictement personnel.
 * Ces identifiants ne sont utilisés que côté serveur (proxy) et ne sont jamais envoyés au navigateur.
 */
export const AUTO_LOGIN = {
  email: process.env.AUTO_LOGIN_EMAIL ?? "roudac.business@gmail.com",
  password: process.env.AUTO_LOGIN_PASSWORD ?? "EKRrt0XmwWGY8iKN05imio4jNcEakROmyXd-RwirXGE",
};
