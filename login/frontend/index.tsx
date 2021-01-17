import * as React from "react";
import { IService, IServiceID } from "../../shared/types/service";

const params = new URL(window.location.href).searchParams;
const initialRedirect = params.get("redirect");
const initialUsername = params.get("username");
const initialPassword = params.get("password");

function Login() {
    const [username, setUsername] = React.useState(initialUsername ?? "");
    const [password, setPassword] = React.useState(initialPassword ?? "");
    const [state, setState] = React.useState<"loading" | "login" | "logging-in" | "logged-in" | "redirecting">("loading");
    const [error, setError] = React.useState("");
    const [services, setServices] = React.useState<IService[]>([]);

    function init() {
        setState("loading");
    }

    async function login() {
        setState("logging-in");

        if(initialRedirect) redirect(initialRedirect as IServiceID);
        else setState("logged-in");
    }

    async function redirect(service: IServiceID) {
        setState("redirecting");
        window.location.href = `/api/redirect/${service}`;
    }

    const heading = <div className="login-heading">
        LOGIN - THE SUITE.
    </div>;

    if(state === "loading") {
        return <div className="login-container">
            {heading}
            <div className="login-message">loading...</div>
        </div>;
    }

    if(state === "logging-in") {
        return <div className="login-container">
            {heading}
            <div className="login-message">logging you in...</div>
        </div>;
    }

    if(state === "redirecting") {
        return <div className="login-container">
            {heading}
            <div className="login-message">redirecting...</div>
        </div>;
    }

    if(state === "logged-in") {
       return <div className="login-container">
            <div className="login-heading">
                THE SUITE.
            </div>
            {services.map(service => (
                <button className="login-service" onClick={() => redirect(service.id)}>
                    {service.name}
                </button>
            ))}
       </div>;
    }

    if(state === "login") {
        return <div className="login-container">
            <label className="login-label" htmlFor="username">Username</label>
            <input className="login-input" id="username" value={username} onChange={e => setUsername(e.target.value)} />
            <label className="login-label" htmlFor="username">Username</label>
            <input className="login-input" id="username" value={username} onChange={e => setUsername(e.target.value)} />
            <button className="login-submit" onClick={login} >Login</button>
        </div>;
    }
}