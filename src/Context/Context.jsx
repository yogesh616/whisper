import { Children, createContext, useContext, useState } from "react";

const UserContext = createContext();


export const UserProvider =({children}) => {
    const [ userListData, setUserListData ] = useState([])
    return <UserContext.Provider value={{userListData, setUserListData}}>
        {children}
    </UserContext.Provider>
}

export const useUser = () => useContext(UserContext)