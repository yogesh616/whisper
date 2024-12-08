import { Children, createContext, useContext, useState } from "react";

const UserContext = createContext();
import bridge from '../assets/bridge.jpg'
import glacier from '../assets/glacier.jpg'
import jinwoo from '../assets/jinwoo.jpg'
import kimino from '../assets/kimino.jpg'
import landscape from '../assets/landscape.jpg'
import name from '../assets/name.jpg'
import sung from '../assets/sung.jpg'
import volcano from '../assets/volcano.jpg'

export const UserProvider =({children}) => {
    const [ userListData, setUserListData ] = useState([])
    const hd_images = ["https://4kwallpapers.com/images/wallpapers/earth-orbit-sun-scenic-12453.jpg",
        "https://4kwallpapers.com/images/wallpapers/november-5k-outer-19789.jpg",
        "https://4kwallpapers.com/images/wallpapers/astronaut-space-10019.jpg",
        "https://4kwallpapers.com/images/wallpapers/earthbound-2024-11791.jpg",
        "https://4kwallpapers.com/images/wallpapers/earth-sunrise-12523.jpg",
        "https://4kwallpapers.com/images/wallpapers/red-flowers-17714.jpg",
        "https://4kwallpapers.com/images/wallpapers/landscape-purple-19680.jpg",
    ] 
    const bgImages = [
        bridge, glacier, jinwoo, kimino, landscape, name, sung, volcano
        
      ];

      const fonts = ["Sour Gummy", "Parkinsans", "Poppins", "Kanit", "Cedarville Cursive"]
    return <UserContext.Provider value={{userListData, setUserListData, bgImages, fonts}}>
        {children}
    </UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
