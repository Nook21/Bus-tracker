import Sidebar from './Sidebar';
import { useSocket } from '../../context/SocketContext';

const DashboardLayout = ({ children }) => {
  const { connected } = useSocket();

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-end gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={`w-2 h-2 rounded-full live-dot ${
                connected ? 'bg-green-500' : 'bg-red-400'
              }`}
            />
            <span className={connected ? 'text-green-600' : 'text-red-500'}>
              {connected ? 'Live' : 'Reconnecting...'}
            </span>
          </div>
        </header>
        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
