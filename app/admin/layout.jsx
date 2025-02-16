import Sidebar from "../componet/Sidebar";

const AdminLayout = ({ children }) => {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
