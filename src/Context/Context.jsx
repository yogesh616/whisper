import { Children, createContext, useContext, useState } from "react";

const UserContext = createContext();


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
        "https://4kwallpapers.com/images/wallpapers/vibrant-landscape-3840x2160-17436.jpg",
        "https://4kwallpapers.com/images/wallpapers/glacier-point-yosemite-valley-national-park-colorful-3840x2160-6412.jpg",
        "https://4kwallpapers.com/images/wallpapers/golden-gate-bridge-3840x2160-17401.jpg",
        "https://4kwallpapers.com/images/wallpapers/volcanic-moon-3840x2160-19153.jpg",
        "https://4kwallpapers.com/images/wallpapers/kimi-no-na-wa-love-3840x2160-19857.jpg",
        "https://4kwallpapers.com/images/wallpapers/your-name-shooting-3840x2160-14938.jpg",
        "https://4kwallpapers.com/images/wallpapers/sung-jinwoo-amoled-3840x2160-15859.jpg",
        "https://4kwallpapers.com/images/wallpapers/sung-jinwoo-solo-3840x2160-17972.jpg",
        
      ];

      const fonts = ["Sour Gummy", "Parkinsans", "Poppins", "Kanit", "Cedarville Cursive"]
    return <UserContext.Provider value={{userListData, setUserListData, bgImages, fonts}}>
        {children}
    </UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
