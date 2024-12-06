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
        "https://4kwallpapers.com/images/walls/thumbs_3t/17436.jpg",
        "https://img.freepik.com/free-vector/dark-gradient-background-with-copy-space_53876-99548.jpg?t=st=1733474664~exp=1733478264~hmac=f3ebf1a3162f4a7f5a43b6165191acdd091f93f18cb7ae1fc8282ca6eb1a37f3&w=1380",
        "https://img.freepik.com/free-vector/set-torii-gates-water_52683-44986.jpg?t=st=1733474732~exp=1733478332~hmac=6667e16c40647a0bd761204a86515a86b3ec823dfa0d4b7034d8458b332b0df4&w=1380",
        "https://img.freepik.com/free-vector/cute-fox-kitsune-surfing-beach-cartoon-vector-icon-illustration-animal-holiday-icon-isolated-flat_138676-9860.jpg?t=st=1733474757~exp=1733478357~hmac=fecab117f0ae769f48ad47a70d375bc627f1136ae1a0adaa33c888c952e92f33&w=826",
        "https://img.freepik.com/free-vector/detailed-chibi-anime-characters_52683-65696.jpg?t=st=1733474786~exp=1733478386~hmac=bf45e0ff6888d186cdb0ab78fd722460c6cd4647274547bd8ed22565829a1886&w=826",
        "https://img.freepik.com/free-vector/hand-drawn-anime-kawaii-illustration_52683-123735.jpg?t=st=1733474826~exp=1733478426~hmac=416b271b7070a98fe9c86c5e5f7f60f95ac0a75540c428a5de0bbe70f9c6efb1&w=826",
        "https://img.freepik.com/free-vector/gradient-japanese-temple-with-sun_52683-44985.jpg?t=st=1733483549~exp=1733487149~hmac=6d38051ca166b9b70c0313974e7477603b97d84c0680d12c9fd20aeef15992d7&w=1380",
        "https://img.freepik.com/free-vector/gradient-japanese-street-with-neon-lights_52683-46239.jpg?t=st=1733483676~exp=1733487276~hmac=e534064adefd33902aa0167f590712f5b3c25e03edd889ff4aa398216dac7bd6&w=1380",
        "https://img.freepik.com/free-photo/robot-human-silhouettes_23-2150042388.jpg?t=st=1733483865~exp=1733487465~hmac=4c14821e071b7e4b39533f320313556fe8b59525558dd9cf690ede007f63d859&w=740",
        "https://img.freepik.com/free-photo/sunset-tranquil-nature-breathtaking-orange-skies-generative-ai_188544-15474.jpg?t=st=1733483892~exp=1733487492~hmac=ef7494e10f375dd8f13add9509c428b989c9665d9ded00f47391d6002ebaadc1&w=1380",
        
      ];

      const fonts = ["Sour Gummy", "Parkinsans", "Poppins", "Kanit", "Cedarville Cursive"]
    return <UserContext.Provider value={{userListData, setUserListData, bgImages, fonts}}>
        {children}
    </UserContext.Provider>
}

export const useUser = () => useContext(UserContext)
