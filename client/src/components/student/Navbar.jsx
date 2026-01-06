import React, { useContext, useEffect } from 'react';
import { assets } from '../../assets/assets';
import { Link, useLocation } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';
import { useClerk, UserButton, useUser } from '@clerk/clerk-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const Navbar = () => {
  const location = useLocation();
  const isCoursesListPage = location.pathname.includes('/course-list');

  const { backendUrl, isEducator, setIsEducator, navigate, getToken } = useContext(AppContext);
  const { openSignIn, user } = useUser();

  // Initialize state based on user role
  useEffect(() => {
    if (user?.publicMetadata?.role === 'educator') {
      setIsEducator(true);
    } else {
      setIsEducator(false);
    }
  }, [user]);

  const toggleEducatorRole = async () => {
    try {
      const token = await getToken();

      // Call backend toggle endpoint
      const { data } = await axios.post(
        `${backendUrl}/api/educator/toggle-role`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (data.success) {
        // Update local state
        setIsEducator(data.role === 'educator');
        toast.success(data.message);

        // Redirect if educator, else optional back to home
        if (data.role === 'educator') navigate('/educator/dashboard');
        else navigate('/');
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className={`flex items-center justify-between px-4 sm:px-10 md:px-14 lg:px-36 border-b border-gray-500 py-4 ${isCoursesListPage ? 'bg-white' : 'bg-cyan-100/70'}`}>
      <img onClick={() => navigate('/')} src={assets.logo} alt="Logo" className="w-28 lg:w-32 cursor-pointer" />

      <div className="md:flex hidden items-center gap-5 text-gray-500">
        <div className="flex items-center gap-5">
          {user && (
            <>
              <button onClick={toggleEducatorRole}>
                {isEducator ? 'Educator Dashboard' : 'Become Educator'}
              </button>
              | <Link to='/my-enrollments'>My Enrollments</Link>
            </>
          )}
        </div>
        {user ? (
          <UserButton />
        ) : (
          <button onClick={() => openSignIn()} className="bg-blue-600 text-white px-5 py-2 rounded-full">
            Create Account
          </button>
        )}
      </div>

      {/* Mobile Navbar */}
      <div className='md:hidden flex items-center gap-2 sm:gap-5 text-gray-500'>
        <div className="flex items-center gap-1 sm:gap-2 max-sm:text-xs">
          <button onClick={toggleEducatorRole}>
            {isEducator ? 'Educator Dashboard' : 'Become Educator'}
          </button>
          | {user && <Link to='/my-enrollments'>My Enrollments</Link>}
        </div>
        {user ? (
          <UserButton />
        ) : (
          <button onClick={() => openSignIn()}>
            <img src={assets.user_icon} alt="" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Navbar;
