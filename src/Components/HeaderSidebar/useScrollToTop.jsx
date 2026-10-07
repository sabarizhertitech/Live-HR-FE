// useScrollToTop.jsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const useScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    if (typeof window !== "undefined" && location?.pathname) {
      window.scrollTo(0, 0);
    }
  }, [location?.pathname]);
};

export default useScrollToTop;