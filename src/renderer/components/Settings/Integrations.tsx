import { useGoogleAuth } from "../../hooks/useGoogleAuth";

const googleDriveIcon = '/googleDrive.png';

const Integrations = () => {

    const googleAuth = useGoogleAuth();

    return (
        <div>
            <h1>Integrations</h1>
            <h2 className="text-xs text-gray-400">Connect third party services to improve your search</h2>

            <div className="flex items-center justify-between mt-4">
                <div className="flex items-center">
                    <img src={googleDriveIcon} alt="Google Drive" className="w-6 h-6 mr-3" />
                    <h2 className="text-xs">Google Drive</h2>
                </div>
                {googleAuth.isAuthenticated ? (
                    <button className="border-1 border-gray-400 px-2 py-1 rounded" onClick={googleAuth.signOut}>
                        <h2 className="text-xs">Disconnect</h2>
                    </button>
                ) : (
                    <button className="border-1 border-gray-400 px-2 py-1 rounded" onClick={googleAuth.signIn}>
                        <h2 className="text-xs">Connect</h2>
                    </button>
                )}
                
            </div>
        </div>
    )
}

export default Integrations;