"use client"

import { MyUsercontextProvider } from "@/hooks/useUser";

interface userProviderProps {
    children: React.ReactNode;
}

const UserProvider: React.FC<userProviderProps> = ({
    children
}) => {
    return (
        <MyUsercontextProvider>
            {children}
        </MyUsercontextProvider>
    )
};

export default UserProvider;