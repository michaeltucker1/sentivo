import React, { ReactElement } from "react";

interface ButtonProps {
    label: string;
    icon: ReactElement;
    onClick: () => void;
    isSelected?: boolean;
}

const Button: React.FC<ButtonProps> = ({ label, icon, onClick, isSelected = false }) => {
    return (
        <div onClick={onClick}>
            {isSelected ? (
                <div className="flex items-center px-2 py-1.25 bg-[#e0e7ff] rounded cursor-pointer font-medium">
                    <div className="pr-2">
                        {icon}
                    </div>
                    <h2 className="font-sans text-[14px] text-[#2c3cca]">{label}</h2>
                </div>
            ) : (
                <div className="flex items-center px-2 py-1.25 rounded cursor-pointer hover:bg-[#e0e7ff]">
                    <div className="pr-2">
                        {icon}
                    </div>
                    <h2 className="font-sans text-[14px] font-normal text-[#100f29]">{label}</h2>
                </div> 
            )}
        </div>
    );
};

export default Button;
