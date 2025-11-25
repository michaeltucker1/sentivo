import React from 'react';
import Icon from '../global/Icon';
import SentivoIcon from "../../Assets/sentivoIcon.png"
const Onboarding: React.FC = () => {
  const handleContinue = () => {
    // Close onboarding window and open search window
    if ((window as any).api) {
      (window as any).api.closeOnboardingAndOpenSearch();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 flex flex-col">
      <div className='pb-5'>
        <img src={SentivoIcon} className='w-25 h-25'/>
      </div>

      <h1 className="text-2xl font-medium mb-4">Welcome to Sentivo</h1>

      <div className="flex flex-row gap-6 max-w-[450px] w-full justify-center mb-10">
    
        <div className="flex-1 border border-neutral-200/70 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-800 mb-1">Use this command</h2>
          <p className="text-sm text-neutral-500 mb-3">Open Sentivo instantly with this shortcut:</p>

          <div className="flex flex-row items-center gap-2 mt-2">
            <div className="flex justify-center items-center border border-neutral-300 bg-white rounded-md px-1.5 py-1">
              <Icon name="chevron-up" size={15} className="text-neutral-500" />
            </div>

            <div className="text-xs text-neutral-500 font-medium">+</div>

            <div className="text-xs text-neutral-600 border border-neutral-300 rounded-md px-2 py-1 bg-white">
              Space
            </div>
          </div>
        </div>

        <div className="flex-1 border border-neutral-200/70 bg-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-neutral-800 mb-1">Setup Integrations</h2>
          <p className="text-sm text-neutral-500">
            Connect your Google Drive account in Settings to start indexing your files.
          </p>
        </div>
      </div>

      <div onClick={handleContinue}>
        <div className="flex items-center px-8 py-1.5 bg-[#e0e7ff] rounded-lg cursor-pointer font-medium 
                    transition-all duration-150
                    hover:bg-[#d8dfff]">
          <h2 className="font-sans text-[18px] text-[#2c3cca]">Continue</h2>
        </div>
      </div>
      
    </div>
  );
};

export default Onboarding;
