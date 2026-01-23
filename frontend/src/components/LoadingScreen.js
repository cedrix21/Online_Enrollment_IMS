import React from 'react';
import logo from "../assets/sics-logo.png";
import "./LoadingScreen.css";

const LoadingScreen = () => {
    return (
        <div className="loading-container">
            <div className="loading-content">
                <img src={logo} alt="SICS Logo" className="loading-logo" />
                <div className="spinner"></div>
                <p>Loading SICS Portal...</p>
            </div>
        </div>
    );
};

export default LoadingScreen;