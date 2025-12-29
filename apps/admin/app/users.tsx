"use client";

import { apiGet } from "@repo/shared/http";
import { UserDTO } from "@repo/types/user";
import { VersionDTO } from "@repo/types/version";
import { useEffect, useState } from "react";

export default function Users() {
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [version, setVersion] = useState<VersionDTO | undefined>(undefined);
  useEffect(() => {
    apiGet<{ users: UserDTO[] }>("http://localhost:4000", "/users").then(
      ({ users }) => {
        setUsers(users ?? []);
      }
    );
  }, []);

  useEffect(() => {
    apiGet<VersionDTO>("http://localhost:4000", "/version").then((data) => {
      setVersion(data);
    });
  }, []);

  return (
    <div>
      <h1>Users {users.length}</h1>
      <h1>Version {version?.version}</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.email}</li>
        ))}
      </ul>
    </div>
  );
}
