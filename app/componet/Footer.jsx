import { FaFacebook, FaTwitter, FaTelegram, FaWhatsapp } from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-6 px-4 md:px-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        <div className="mb-4 md:mb-0">
          <h2 className="text-xl font-bold">Ethio cinema Ticketing</h2>
        </div>

        <div className="flex space-x-4 mb-4 md:mb-0">
          <a 
            href="https://www.facebook.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-blue-400 transition"
          >
            <FaFacebook size={24} />
          </a>
          <a 
            href="https://www.twitter.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-blue-300 transition"
          >
            <FaTwitter size={24} />
          </a>
          <a 
            href="https://www.telegram.me" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-blue-500 transition"
          >
            <FaTelegram size={24} />
          </a>
          <a 
            href="https://www.whatsapp.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-green-400 transition"
          >
            <FaWhatsapp size={24} />
          </a>
        </div>

        <ul className="flex space-x-4 text-sm">
          <li><a href="/" className="hover:text-gray-300">Home</a></li>
          <li><a href="#" className="hover:text-gray-300">About</a></li>
          <li><a href="#" className="hover:text-gray-300">Contact</a></li>
        </ul>
      </div>

      <div className="text-center text-xs text-gray-400 mt-6">
        © {new Date().getFullYear()} Ethio cinema ticketing. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;