import { useEffect, useState, useContext } from 'react';
import { AppContext } from '../../context/AppContext';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const CertificatePage = () => {
  const { courseId } = useParams();
  const { backendUrl, userData, getToken } = useContext(AppContext);
  const [certificateUrl, setCertificateUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;

    let interval;

    const fetchCertificate = async () => {
      try {
        const token = await getToken();
        const { data } = await axios.post(
          `${backendUrl}/api/course/get-certificate`,
          { userId: userData._id, courseId },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (data.download_url) {
          setCertificateUrl(data.download_url);
          setLoading(false);
        } else {
          console.log('Certificate not ready yet...');
        }
      } catch (err) {
        toast.error(err.message);
        setLoading(false);
      }
    };

    // Poll every 5 seconds in case final PDF is updated via webhook
    interval = setInterval(fetchCertificate, 5000);
    fetchCertificate(); // initial fetch

    return () => clearInterval(interval);
  }, [courseId, backendUrl, userData, getToken]);

  if (!userData) {
    return <p className="p-8 text-center text-gray-500">Loading user info...</p>;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">🎓 Your Certificate</h1>

      {loading ? (
        <p className="text-center text-gray-500">Generating your certificate...</p>
      ) : certificateUrl ? (
        <a
          href={certificateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-green-600 text-white font-semibold py-4 rounded-lg text-center hover:bg-green-700 transition-colors"
        >
          Download Certificate
        </a>
      ) : (
        <p className="text-center text-gray-500">
          Certificate is being generated. Please wait a few seconds.
        </p>
      )}
    </div>
  );
};

export default CertificatePage;
