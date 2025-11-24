import { useGoogleAuth } from "../../hooks/useGoogleAuth";
import googleDriveIcon from "../../Assets/googleDrive.png"

const Integrations = () => {

    const googleAuth = useGoogleAuth();

    return (
        <div>
            <h1 className="text-lg font-medium">Integrations</h1>
            <h2 className="text-sm text-[#6b6b7b]">Connect third party services to improve your search</h2>
            <div className="flex items-center justify-between mt-5">
                <div className="flex items-center">
                    <img src={googleDriveIcon} alt="Google Drive" className="w-5 h-5 mr-3" />
                    <h2 className="text-[14px] font-medium">Google Drive</h2>
                </div>
                {googleAuth.isAuthenticated ? (
                    <button className="flex items-center justify-center px-3 py-1.25 bg-[#e0e7ff] text-[#2c3cca] font-medium text-[10px] rounded-md hover:bg-[#d9e0ff] cursor-pointer" onClick={googleAuth.signOut}>
                        <h2 className="text-[14px]">Disconnect</h2>
                    </button>
                ) : (
                    <button className="flex items-center justify-center px-3 py-1.25 border border-[#d4d4d8] text-[#100f29] font-medium text-[10px] rounded-md hover:bg-[#f4f4f5] cursor-pointer" onClick={googleAuth.signIn}>
                        <h2 className="text-[14px]">Connect</h2>
                    </button>
                )}
                
            </div>
        </div>
    )
}

export default Integrations;