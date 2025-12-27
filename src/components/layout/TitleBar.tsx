   import { Window } from "@tauri-apps/api/window";
   import logo from "../../../src-tauri/icons/icon.png";
   import "../../styles/TitleBar.css";

   export default function TitleBar() {
     const appWindow = Window.getCurrent();
     return (
       <div className="titlebar" data-tauri-drag-region>
         <div className="titlebar-left" data-tauri-drag-region>
           <img src={logo} alt="logo" width={16} height={16} />
           <span className="title">StackScribe</span>
         </div>

         <div className="titlebar-buttons">
          <div className="titlebar-button-container" data-tauri-drag-region="false">
            <button onClick={() => appWindow.minimize()}   title="Minimise"> — </button>
          </div>
          <div className="titlebar-button-container" data-tauri-drag-region="false">
            <button  onClick={async () => {
              try {
                const isMaximized = await appWindow.isMaximized();
                if (isMaximized) {
                  await appWindow.unmaximize();
                } else {
                  await appWindow.maximize();
                }
              } catch (error) {
                console.error('Error toggling maximize:', error);
              }
            }} title="Max/Restore"> ☐ </button>
          </div>
          <div className="titlebar-button-container" data-tauri-drag-region="false">
            <button onClick={() => appWindow.close()}      title="Close"> ✕ </button>
          </div>
         </div>
       </div>
     );
   }


