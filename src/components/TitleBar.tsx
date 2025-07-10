   import { Window } from "@tauri-apps/api/window";
   import logo from "../../src-tauri/icons/icon.png";
   import "../Styles/TitleBar.css";

   export default function TitleBar() {
     const appWindow = Window.getCurrent();
     return (
       <div className="titlebar" data-tauri-drag-region>
         <div className="titlebar-left" data-tauri-drag-region>
           <img src={logo} alt="logo" width={16} height={16} />
           <span className="title">StackScribe</span>
         </div>

         <div className="titlebar-buttons">
           <button onClick={() => appWindow.minimize()}   title="Minimise"> — </button>
           <button onClick={() => appWindow.toggleMaximize()} title="Max/Restore"> ☐ </button>
           <button onClick={() => appWindow.close()}      title="Close"> ✕ </button>
         </div>
       </div>
     );
   }


