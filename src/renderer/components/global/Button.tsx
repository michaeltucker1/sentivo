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
                <div className="flex px-4 py-3 bg-[#f1f1fd] rounded">
                    <div className="pr-2">
                        {icon}
                    </div>
                    <h2 className="font-sans text-xs font-normal text-[#2c3cca]">{label}</h2>
                </div>
            ) : (
                <div className="flex px-4 py-3 rounded">
                    <div className="pr-2">
                        {icon}
                    </div>
                    <h2 className="font-sans text-xs font-normal text-[#100f29]">{label}</h2>
                </div>
            )}
        </div>
    );
};

export default Button;
