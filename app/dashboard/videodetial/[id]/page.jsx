'use client';
import React, { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  db,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  getDocs,
  Timestamp,
} from '../../../firebaseconfig';
import { PuffLoader } from 'react-spinners';
import { FaArrowLeft, FaStar, FaChevronDown, FaChevronUp, FaTimes } from 'react-icons/fa';
import { ThemeContext } from '../../../context/ThemeContext';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { toGregorian, toEthiopian } from 'ethiopian-date';

const ethMonths = [
  'Meskerem',
  'Tikimt',
  'Hidar',
  'Tahsas',
  'Tir',
  'Yekatit',
  'Megabit',
  'Miazia',
  'Ginbot',
  'Sene',
  'Hamle',
  'Nehase',
  'Pagume',
];

function EthiopianDatePicker({ name, value, onChange, error, theme }) {
  const getCurrentEthiopianDate = () => {
    const today = new Date();
    const [ethYear, ethMonth, ethDay] = toEthiopian(
      today.getFullYear(),
      today.getMonth() + 1,
      today.getDate()
    );
    return `${ethYear}-${String(ethMonth).padStart(2, '0')}-${String(ethDay).padStart(2, '0')}`;
  };

  const initialDate = value ? value.split('T')[0] : getCurrentEthiopianDate();
  const initialTime = value ? value.split('T')[1] || '00:00' : '00:00';

  const [ethiopianDate, setEthiopianDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);

  useEffect(() => {
    if (value) {
      const [datePart, timePart] = value.split('T');
      setEthiopianDate(datePart);
      setTime(timePart || '00:00');
    } else {
      const currentEthiopianDate = getCurrentEthiopianDate();
      setEthiopianDate(currentEthiopianDate);
      setTime('00:00');
    }
  }, [value]);

  const handleDateChange = (e) => {
    const { value } = e.target;
    setEthiopianDate(value);
    onChange({ target: { name, value: `${value}T${time}` } });
  };

  const handleTimeChange = (e) => {
    const { value } = e.target;
    setTime(value);
    if (ethiopianDate) {
      onChange({ target: { name, value: `${ethiopianDate}T${value}` } });
    }
  };

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="date"
          value={ethiopianDate}
          onChange={handleDateChange}
          className={`mt-1 block w-1/2 px-3 py-2 rounded-lg border ${
            error
              ? 'border-2 border-red-500 focus:border-red-500 focus:ring-red-500'
              : theme === 'light'
              ? 'border-gray-300 bg-white text-gray-900 focus:ring-indigo-500'
              : 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-indigo-500'
          } focus:outline-none focus:ring-2`}
        />
        <input
          type="time"
          value={time}
          onChange={handleTimeChange}
          className={`mt-1 block w-1/2 px-3 py-2 rounded-lg border ${
            error
              ? 'border-2 border-red-500 focus:border-red-500 focus:ring-red-500'
              : theme === 'light'
              ? 'border-gray-300 bg-white text-gray-900 focus:ring-indigo-500'
              : 'border-gray-600 bg-gray-700 text-gray-100 focus:ring-indigo-500'
          } focus:outline-none focus:ring-2`}
        />
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </div>
  );
}

const formatEthiopianDate = (dateString) => {
  const [datePart, timePart] = dateString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [gregYear, gregMonth, gregDay] = toGregorian(year, month, day);
  const date = new Date(gregYear, gregMonth - 1, gregDay);
  const [ethYear, ethMonth, ethDay] = toEthiopian(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );

  const [hours, minutes] = timePart.split(':');
  const hourNum = parseInt(hours);
  const isPM = hourNum >= 12;
  const hour12 = hourNum % 12 || 12;
  const time = `${hour12.toString().padStart(2, '0')}:${minutes} ${isPM ? 'PM' : 'AM'}`;

  return `${ethDay} ${ethMonths[ethMonth - 1]} ${ethYear}, ${time}`;
};

export default function VideoDetail({ params: paramsPromise }) {
  const params = React.use(paramsPromise);
  const { id } = params;
  const router = useRouter();
  const { theme } = useContext(ThemeContext);

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [soldTickets, setSoldTickets] = useState(0);
  const [ticketPrice, setTicketPrice] = useState(0);
  const [availableSite, setAvailableSite] = useState(0);
  const [ownerTotalAmount, setOwnerTotalAmount] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [userProfiles, setUserProfiles] = useState({});
  const [showMore, setShowMore] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null);
  const [dialogMessage, setDialogMessage] = useState('');
  const [showPostponeForm, setShowPostponeForm] = useState(false);
  const [newScreeningDate, setNewScreeningDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [tickets, setTickets] = useState([]);
  const [isPending, setIsPending] = useState(null);

  const fetchUserProfile = async (userId) => {
    try {
      const userRef = doc(db, 'Users', userId);
      const unsubscribe = onSnapshot(userRef, (userDoc) => {
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfiles((prev) => ({
            ...prev,
            [userId]: { email: data.email || userId },
          }));
        } else {
          setUserProfiles((prev) => ({
            ...prev,
            [userId]: { email: userId },
          }));
        }
      }, () => {
        setUserProfiles((prev) => ({
          ...prev,
          [userId]: { email: userId },
        }));
      });
      return unsubscribe;
    } catch {
      return () => {};
    }
  };

  const addProvidedReview = async (movieDocRef, currentReviews) => {
    try {
      const providedReview = {
        rating: 3,
        review: 'mis wedfkjdfskjkdhfsjkjhdfsjk',
        timestamp: Timestamp.fromDate(new Date('2025-05-18T13:28:09-08:00')),
        userId: 'mekuriawerede64@gmail.com',
      };

      const reviewExists = currentReviews.some(
        (r) =>
          r.userId === providedReview.userId &&
          r.review === providedReview.review &&
          r.timestamp.toMillis() === providedReview.timestamp.toMillis()
      );

      if (!reviewExists) {
        const cleanedReviews = currentReviews.map(({ rating, review, timestamp, userId }) => ({
          rating,
          review,
          timestamp,
          userId,
        }));
        await updateDoc(movieDocRef, {
          reviews: [...cleanedReviews, providedReview],
        });
        toast.success('Review added successfully!', {
          position: 'bottom-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme,
        });
      }
    } catch (error) {
      console.error('Error adding review:', error);
      toast.error('Failed to add review.', {
        position: 'bottom-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme,
      });
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/validate', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          toast.error('Unauthorized access. Please log in.', {
            position: 'bottom-right',
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme,
          });
          setTimeout(() => {
            router.replace('/login');
          }, 3500);
          throw new Error('Unauthorized');
        }

        const data = await response.json();
        if (data.email && data.role) {
          if (data.role !== 'owner') {
            toast.error('User is not an owner.', {
              position: 'bottom-right',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme,
            });
            setTimeout(() => {
              router.replace('/login');
            }, 3500);
            throw new Error('User is not an owner');
          }
          setUserEmail(data.email);
          setUserRole(data.role);

          const ownerQuery = query(
            collection(db, 'owner'),
            where('email', '==', data.email)
          );
          const ownerSnapshot = await getDocs(ownerQuery);
          if (!ownerSnapshot.empty) {
            const ownerData = ownerSnapshot.docs[0].data();
            setIsPending(ownerData.pending === true);
          } else {
            toast.error('Owner details not found.', {
              position: 'bottom-right',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme,
            });
            throw new Error('Owner details not found');
          }

          const unsubscribePending = onSnapshot(
            ownerQuery,
            (querySnapshot) => {
              if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0].data();
                setIsPending(userDoc.pending === true);
              } else {
                setIsPending(false);
              }
            },
            (error) => {
              toast.error('Failed to fetch pending status.', {
                position: 'bottom-right',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                theme,
              });
            }
          );

          return () => unsubscribePending();
        } else {
          toast.error('No email or role found.', {
            position: 'bottom-right',
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme,
          });
          setTimeout(() => {
            router.replace('/login');
          }, 3500);
          throw new Error('No email or role found');
        }
      } catch (error) {
        // Handled via toast and redirect
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [router, theme]);

  useEffect(() => {
    if (userEmail && isPending === false) {
      const q = query(collection(db, 'ownerAmount'), where('movieEmail', '==', userEmail));
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          let total = 0;
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            total += data.totalAmount || 0;
          });
          setOwnerTotalAmount(total);
        },
        (error) => {
          console.error('Error fetching owner total amount:', error);
          toast.error('Failed to fetch owner total amount.', {
            position: 'bottom-right',
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme,
          });
        }
      );
      return () => unsubscribe();
    }
  }, [userEmail, theme, isPending]);

  useEffect(() => {
    if (id && userRole === 'owner' && isPending === false) {
      const q = query(collection(db, 'Movies'), where('movieID', '==', id));
      const unsubscribe = onSnapshot(
        q,
        async (querySnapshot) => {
          if (!querySnapshot.empty) {
            const movieDoc = querySnapshot.docs[0];
            const movieData = movieDoc.data();
            setVideo(movieData);
            setSoldTickets(movieData.soldTickets || 0);
            setTicketPrice(movieData.ticketPrice || 0);
            setAvailableSite(movieData.availableSite || 0);

            let reviewsData = [];
            if (Array.isArray(movieData.reviews) && movieData.reviews.length > 0) {
              const uniqueReviews = new Set();
              reviewsData = movieData.reviews
                .filter((review) => {
                  return review.userId && review.rating && review.review && review.timestamp;
                })
                .filter((review) => {
                  const reviewKey = `${review.userId}-${review.timestamp?.toMillis() || ''}-${review.review}`;
                  if (uniqueReviews.has(reviewKey)) {
                    return false;
                  }
                  uniqueReviews.add(reviewKey);
                  return true;
                })
                .map((review, index) => ({
                  id: `${id}-${review.userId}-${index}`,
                  rating: review.rating,
                  review: review.review,
                  timestamp: review.timestamp,
                  userId: review.userId,
                }));

              const userIds = [...new Set(reviewsData.map((review) => review.userId))];
              const unsubscribeUsers = userIds.map(fetchUserProfile);
              setReviews(reviewsData);

              if (id === 'sBlZqZ3U') {
                await addProvidedReview(doc(db, 'Movies', movieDoc.id), reviewsData);
              }

              return () => {
                unsubscribeUsers.forEach((unsubscribe) => unsubscribe());
              };
            } else {
              setReviews([]);
            }
          } else {
            toast.error('No video found with the given ID!', {
              position: 'bottom-right',
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              theme,
            });
            setVideo(null);
          }
          setLoading(false);
        },
        () => {
          setVideo(null);
          setLoading(false);
        }
      );

      return () => {
        unsubscribe();
      };
    }
  }, [id, userRole, theme, isPending]);

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/movies');
    }
  };

  const checkIfCancelled = async () => {
    try {
      const q = query(collection(db, 'CancelledTickets'), where('movieID', '==', id));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking cancellation status:', error);
      toast.error('Failed to check cancellation status.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme,
      });
      return false;
    }
  };

  const checkPaymentHistory = async () => {
    try {
      const paymentHistoryRef = collection(db, 'paymentHistory');
      const q = query(paymentHistoryRef, where('movieId', '==', id));
      const paymentSnapshot = await getDocs(q);

      if (paymentSnapshot.empty) {
        setTickets([]);
        return [];
      }

      const ticketsData = await Promise.all(
        paymentSnapshot.docs.map(async (doc) => {
          const ticketData = doc.data();
          const moviesRef = collection(db, 'Movies');
          const movieQuery = query(moviesRef, where('movieID', '==', ticketData.movieId));
          const movieSnapshot = await getDocs(movieQuery);

          let movieDetails = {};
          if (!movieSnapshot.empty) {
            const movieData = movieSnapshot.docs[0].data();
            movieDetails = {
              title: movieData.title,
              cinemaLocation: movieData.cinemaLocation,
              cinemaName: movieData.cinemaName,
            };
          }

          return {
            id: doc.id,
            data: {
              firstName: ticketData.firstName,
              lastName: ticketData.lastName,
              movieId: ticketData.movieId,
              orderId: ticketData.orderId,
              paymentDate: ticketData.paymentDate,
              ticketId: ticketData.ticketId || doc.id,
              screeningDate: ticketData.screeningDate || 'Date TBD',
              docId: doc.id,
              movieDetails,
              postponedStatus: ticketData.postponedStatus || 0,
              canceledStatus: ticketData.canceledStatus || 0,
            },
          };
        })
      );

      setTickets(ticketsData.map((item) => item.data));
      return ticketsData;
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateOrInsertPaymentHistory = async (movieId, updates, isPostponement = false, oldScreeningDate = null, newScreeningDate = null) => {
    try {
      const paymentHistoryDocs = await checkPaymentHistory();
      const isPostponed = updates.postponed === 'true';

      if (paymentHistoryDocs.length > 0) {
        for (const payment of paymentHistoryDocs) {
          if (payment.data.movieId === movieId) {
            const paymentRef = doc(db, 'paymentHistory', payment.id);
            const updateData = {
              postponed: isPostponed ? 'true' : 'false',
              cancelled: updates.cancelled,
              status: 1,
              lastUpdated: Timestamp.now(),
              postponedStatus: isPostponed ? 1 : (updates.cancelled === 'true' ? 0 : payment.data.postponedStatus || 0),
              canceledStatus: updates.cancelled === 'true' ? 1 : 0,
            };
            if (isPostponement) {
              updateData.oldScreeningDate = oldScreeningDate || payment.data.screeningDate || 'Unknown';
              updateData.newScreeningDate = newScreeningDate || 'Unknown';
            }
            await updateDoc(paymentRef, updateData);
          }
        }
      } else {
        const now = new Date();
        const [ethYear, ethMonth, ethDay] = toEthiopian(
          now.getFullYear(),
          now.getMonth() + 1,
          now.getDate()
        );
        const ethDate = `${ethDay} ${ethMonths[ethMonth - 1]} ${ethYear}, ${now
          .toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' })
          .replace(/,/, '')}`;
        const orderId = `TX-${Date.now()}`;
        const ticketId = `WO-FU-${Math.floor(1000 + Math.random() * 9000)}`;

        const newDocData = {
          email: userEmail || 'mekuriawerede64@gmail.com',
          firstName: 'mekuria',
          lastName: 'were',
          movieId,
          orderId,
          paymentDate: Timestamp.now(),
          postponed: isPostponed ? 'true' : 'false',
          cancelled: updates.cancelled,
          status: 1,
          purchaseDateEthiopian: ethDate,
          screeningDate: video?.screeningDate || 'Unknown',
          seatNumber: '1',
          ticketId,
          lastUpdated: Timestamp.now(),
          postponedStatus: isPostponed ? 1 : 0,
          canceledStatus: updates.cancelled === 'true' ? 1 : 0,
        };

        if (isPostponement) {
          newDocData.oldScreeningDate = oldScreeningDate || video?.screeningDate || 'Unknown';
          newDocData.newScreeningDate = newScreeningDate || 'Unknown';
        }

        await addDoc(collection(db, 'paymentHistory'), newDocData);
      }

      toast.success('Payment history updated successfully.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme,
      });
    } catch (error) {
      console.error('Error updating or inserting payment history:', error);
      toast.error('Failed to update payment history.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme,
      });
    }
  };

  const validateTotalAmount = () => {
    const requiredAmount = soldTickets * ticketPrice * 1.03;
    if (ownerTotalAmount < requiredAmount) {
      toast.error(
        `Insufficient funds. Total amount (${ownerTotalAmount}) is less than required (${
          soldTickets * ticketPrice
        } + 3% = ${requiredAmount.toFixed(2)}).`,
        {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme,
        }
      );
      return false;
    }
    return true;
  };

  const handleTicketCancellation = () => {
    setIsModalOpen(true);
    setShowPostponeForm(false);
  };

  const handleOpenDialog = async (action) => {
    if (action === 'cancel') {
      const isCancelled = await checkIfCancelled();
      if (isCancelled) {
        setIsModalOpen(false);
        toast.error('The ticket is already canceled.', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme,
        });
        return;
      }
      setIsModalOpen(false);
      setDialogAction(action);
      setDialogMessage('Are you sure you want to cancel all tickets?');
      setIsDialogOpen(true);
    } else if (action === 'postpone') {
      setShowPostponeForm(true);
      setIsModalOpen(true);
    }
  };

  const handleConfirmDialog = async () => {
    try {
      if (dialogAction === 'cancel') {
        if (!validateTotalAmount()) {
          setIsDialogOpen(false);
          return;
        }

        await addDoc(collection(db, 'CancelledTickets'), {
          movieID: id,
          title: video.title,
          timestamp: Timestamp.now(),
          userEmail,
        });

        await updateOrInsertPaymentHistory(id, { postponed: 'false', cancelled: 'true' });

        const movieQuery = query(collection(db, 'Movies'), where('movieID', '==', id));
        const movieSnapshot = await getDocs(movieQuery);
        if (!movieSnapshot.empty) {
          const movieDocRef = doc(db, 'Movies', movieSnapshot.docs[0].id);
          await updateDoc(movieDocRef, {
            cancellation: true,
            lastUpdated: Timestamp.now(),
          });
        }

        toast.success('All tickets cancelled successfully.', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme,
        });
      }
    } catch (error) {
      console.error('Error processing action:', error);
      toast.error('Failed to process the action.', {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme,
      });
    } finally {
      setIsDialogOpen(false);
      setDialogAction(null);
      setDialogMessage('');
    }
  };

  const handleCancelDialog = () => {
    setIsDialogOpen(false);
    setIsModalOpen(true);
    setShowPostponeForm(false);
    setDialogAction(null);
    setDialogMessage('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setShowPostponeForm(false);
    setNewScreeningDate('');
    setDateError('');
  };

  const validateScreeningDate = (dateString) => {
    if (!dateString) {
      return 'Please select a valid screening date and time.';
    }
    const [datePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [gregYear, gregMonth, gregDay] = toGregorian(year, month, day);
    const screeningDate = new Date(gregYear, gregMonth - 1, gregDay);
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + 1);
    minDate.setHours(0, 0, 0, 0);

    if (screeningDate < minDate) {
      return 'Screening date must be at least one day in the future';
    }
    return '';
  };

  const handleUpdateScreeningDate = async (e) => {
    e.preventDefault();
    const validationError = validateScreeningDate(newScreeningDate);
    if (validationError) {
      setDateError(validationError);
      return;
    }

    try {
      if (!validateTotalAmount()) {
        return;
      }

      const movieQuery = query(collection(db, 'Movies'), where('movieID', '==', id));
      const movieSnapshot = await getDocs(movieQuery);
      if (!movieSnapshot.empty) {
        const movieDocRef = doc(db, 'Movies', movieSnapshot.docs[0].id);
        const formattedDate = formatEthiopianDate(newScreeningDate);
        const oldScreeningDate = video.screeningDate || 'Unknown';

        await updateDoc(movieDocRef, {
          screeningDate: formattedDate,
          lastUpdated: Timestamp.now(),
          isEthiopianDate: true,
        });

        await addDoc(collection(db, 'Postponed'), {
          movieID: id,
          newScreeningDate: formattedDate,
          timestamp: Timestamp.now(),
          userEmail,
        });

        await updateOrInsertPaymentHistory(
          id,
          { postponed: 'true', cancelled: 'false' },
          true,
          oldScreeningDate,
          formattedDate
        );

        toast.success('Screening date updated and postponement recorded successfully.', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme,
        });
        setIsModalOpen(false);
        setShowPostponeForm(false);
        setNewScreeningDate('');
        setDateError('');
      } else {
        toast.error('Movie not found.', {
          position: 'top-right',
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          theme,
        });
      }
    } catch (error) {
      console.error('Error updating screening date or recording postponement:', error);
      toast.error(`Failed to update: ${error.message}`, {
        position: 'top-right',
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme,
      });
    }
  };

  // Conditional rendering for loading, auth, pending status, and video data
  if (loading || userRole !== 'owner' || isPending === null) {
    return (
      <div
        className={`min-h-screen p-4 sm:p-6 ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'} flex items-center justify-center`}
      >
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color={theme === 'light' ? '#3b82f6' : '#FFFFFF'} size={100} />
          <motion.p
            className={`mt-4 text-2xl font-bold ${theme === 'light' ? 'text-zinc-700' : 'text-zinc-300'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            {isPending === null ? 'Checking status...' : 'Loading movie details...'}
          </motion.p>
        </motion.div>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={theme}
        />
      </div>
    );
  }

  if (isPending === true) {
    return (
      <div
        className={`min-h-screen p-4 sm:p-6 ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'} flex items-center justify-center`}
      >
        <motion.div
          className="text-center px-4"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <motion.h1
            className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            Request Pending
          </motion.h1>
          <motion.p
            className={`mt-4 text-lg sm:text-xl ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            Your request is being processed. Please wait a few days.
          </motion.p>
          <motion.div
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.8 }}
          >
            <div className="flex justify-center">
              <div className="w-16 h-16 sm:w-24 sm:h-24 border-4 border-purple-500 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p className={`mt-4 ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'} text-sm sm:text-base`}>
              We appreciate your patience!
            </p>
          </motion.div>
        </motion.div>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={theme}
        />
      </div>
    );
  }

  if (!video) {
    return (
      <div
        className={`min-h-screen p-4 sm:p-6 ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'} flex items-center justify-center`}
      >
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PuffLoader color={theme === 'light' ? '#ef4444' : '#f87171'} size={120} />
          <p
            className={`mt-4 text-2xl font-bold ${theme === 'light' ? 'text-gray-800' : 'text-gray-200'}`}
          >
            Movie not found!
          </p>
        </motion.div>
        <ToastContainer
          position="bottom-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={theme}
        />
      </div>
    );
  }

  // Main UI when video is available
  const totalTickets = soldTickets + availableSite;
  const soldPercentage = totalTickets > 0 ? (soldTickets / totalTickets) * 100 : 0;
  const availablePercentage = totalTickets > 0 ? (availableSite / totalTickets) * 100 : 0;

  const visibleFields = [
    { label: 'Title', value: video.title },
    { label: 'Category', value: video.category },
    { label: 'Duration', value: video.duration },
    { label: 'Cinema Name', value: video.cinemaName },
    { label: 'Location', value: video.cinemaLocation },
    { label: 'Available Seats', value: video.availableSite },
    { label: 'Ticket Price', value: `$${video.ticketPrice}` },
    { label: 'Description', value: video.description },
    { label: 'Screening Date', value: video.screeningDate },
  ];

  const hiddenFields = [
    {
      label: 'Created At',
      value: video.createdAt ? video.createdAt.toDate().toLocaleString() : 'Not available',
    },
    {
      label: 'Last Updated',
      value: video.lastUpdated ? video.lastUpdated.toDate().toLocaleString() : 'Not available',
    },
    { label: 'Email', value: video.email || 'Not available' },
    { label: 'First Name', value: video.firstName || 'Not available' },
    { label: 'Last Name', value: video.lastName || 'Not available' },
    { label: 'Is Ethiopian Date', value: video.isEthiopianDate ? 'Yes' : 'No' },
    {
      label: 'Promotion Video',
      value: video.promotionVideo ? (
        <a
          href={video.promotionVideo}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-500 hover:underline"
        >
          View Video
        </a>
      ) : (
        'Not available'
      ),
    },
    {
      label: 'Rating',
      value: video.rating ? video.rating.toFixed(2) : 'Not rated',
    },
    {
      label: 'Sold Tickets',
      value: video.soldTickets !== undefined ? video.soldTickets : 'Not available',
    },
    {
      label: 'Uploading Date',
      value: video.uploadingDate ? video.uploadingDate.toDate().toLocaleString() : 'Not available',
    },
    {
      label: 'Main Cast',
      value: video.mainCast?.length ? (
        video.mainCast.map((cast) => (
          <div key={cast.name} className="flex items-center gap-2">
            <img
              src={cast.image}
              alt={cast.name}
              className="w-10 h-10 rounded-full object-cover"
              loading="lazy"
            />
            <span>{cast.name}</span>
          </div>
        ))
      ) : (
        'No cast available'
      ),
    },
    {
      label: 'Seats',
      value: video.seats?.length ? (
        video.seats.map((seat) => (
          <div key={seat.id} className="flex gap-2">
            <span>Seat {seat.number}:</span>
            <span>{seat.reserved ? 'Reserved' : 'Available'}</span>
          </div>
        ))
      ) : (
        'No seats available'
      ),
    },
  ];

  return (
    <div
      className={`min-h-screen font-sans p-4 sm:p-6 ${theme === 'light' ? 'bg-zinc-100' : 'bg-zinc-900'} relative`}
    >
      <style jsx global>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme}
      />

      <div
        id="page-content"
        className={`transition-all duration-300 ${
          isModalOpen || isDialogOpen ? 'blur-sm pointer-events-none' : ''
        }`}
      >
        <div
          className={`sticky top-0 z-50 ${
            theme === 'light'
              ? 'bg-gradient-to-br from-zinc-100 to-zinc-200'
              : 'bg-gradient-to-br from-gray-800 to-gray-900'
          } border-b ${theme === 'light' ? 'border-zinc-200' : 'border-zinc-700'}`}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <motion.button
                onClick={handleBack}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  theme === 'light'
                    ? 'text-purple-700 hover:bg-purple-100'
                    : 'text-purple-300 hover:bg-purple-800'
                } transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaArrowLeft className="h-5 w-5" />
                <span className="text-lg font-medium">Back</span>
              </motion.button>
              <p
                className={`text-2xl font-bold ${
                  theme === 'light' ? 'text-gray-900' : 'text-gray-100'
                } mx-auto truncate max-w-md text-center`}
              >
                {video.title}
              </p>
              {video.cancellation ? (
                <p className="text-lg font-medium text-red-500">
                  The movie is canceled
                </p>
              ) : (
                <motion.button
                  onClick={handleTicketCancellation}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    theme === 'light'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  } transition-colors`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Cancel tickets"
                >
                  <FaTimes className="h-5 w-5" />
                  <span className="text-lg font-medium">Cancel Ticket</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex flex-col lg:flex-row gap-8">
              <div className="lg:w-3/4 space-y-8">
                <motion.section
                  className={`p-6 sm:p-8 rounded-2xl shadow-xl ${
                    theme === 'light'
                      ? 'bg-gradient-to-br from-blue-50 to-purple-50'
                      : 'bg-gradient-to-br from-gray-800 to-gray-900'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <h2
                    className={`text-2xl font-bold ${
                      theme === 'light' ? 'text-gray-800' : 'text-gray-100'
                    } mb-6`}
                  >
                    Movie Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {visibleFields.map((item, index) => (
                      <motion.div
                        key={index}
                        className={`p-4 rounded-lg ${
                          theme === 'light' ? 'bg-gray-50' : 'bg-gray-800'
                        } hover:bg-opacity-80 transition-colors`}
                        whileHover={{ scale: 1.02 }}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 300, delay: 0.4 + index * 0.1, duration: 0.3 }}
                      >
                        <h3
                          className={`text-sm font-medium ${
                            theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                          }`}
                        >
                          {item.label}
                        </h3>
                        <div
                          className={`text-lg ${theme === 'light' ? 'text-gray-800' : 'text-gray-100'}`}
                        >
                          {item.value}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <motion.div
                    className="mt-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                  >
                    <button
                      onClick={() => setShowMore(!showMore)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                        theme === 'light'
                          ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                          : 'bg-purple-600 text-white hover:bg-purple-700'
                      } transition-colors`}
                      aria-label={showMore ? 'Show less details' : 'Show more details'}
                    >
                      {showMore ? (
                        <>
                          <FaChevronUp /> Less
                        </>
                      ) : (
                        <>
                          <FaChevronDown /> More
                        </>
                      )}
                    </button>
                    {showMore && (
                      <motion.div
                        className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                      >
                        {hiddenFields.map((item, index) => (
                          <motion.div
                            key={index}
                            className={`p-4 rounded-lg ${
                              theme === 'light' ? 'bg-gray-50' : 'bg-gray-800'
                            } hover:bg-opacity-80 transition-colors`}
                            whileHover={{ scale: 1.02 }}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ type: 'spring', stiffness: 300, delay: 0.6 + index * 0.1, duration: 0.3 }}
                          >
                            <h3
                              className={`text-sm font-medium ${
                                theme === 'light' ? 'text-gray-500' : 'text-gray-400'
                              }`}
                            >
                              {item.label}
                            </h3>
                            <div
                              className={`text-lg ${theme === 'light' ? 'text-gray-800' : 'text-gray-100'}`}
                            >
                              {item.value}
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                </motion.section>

                <motion.section
                  className={`p-6 sm:p-8 rounded-2xl shadow-xl ${
                    theme === 'light'
                      ? 'bg-gradient-to-br from-blue-50 to-purple-50'
                      : 'bg-gradient-to-br from-gray-800 to-gray-900'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}
                >
                  <h2
                    className={`text-2xl font-bold ${
                      theme === 'light' ? 'text-gray-800' : 'text-gray-100'
                    } mb-6`}
                  >
                    Ticket Statistics
                  </h2>
                  <div className="space-y-6">
                    <div>
                      <p
                        className={`text-lg ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} mb-2`}
                      >
                        Sold Tickets: <span className="font-bold">{soldTickets}</span>
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <motion.div
                          className="bg-indigo-500 h-4 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${soldPercentage}%` }}
                          transition={{ delay: 0.6, duration: 0.8 }}
                        />
                      </div>
                    </div>
                    <div>
                      <p
                        className={`text-lg ${theme === 'light' ? 'text-gray-700' : 'text-gray-300'} mb-2`}
                      >
                        Available Tickets: <span className="font-bold">{availableSite}</span>
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-4">
                        <motion.div
                          className="bg-purple-500 h-4 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${availablePercentage}%` }}
                          transition={{ delay: 0.7, duration: 0.8 }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.section>

                <motion.section
                  className={`p-6 sm:p-8 rounded-2xl shadow-xl ${
                    theme === 'light'
                      ? 'bg-gradient-to-br from-blue-50 to-purple-50'
                      : 'bg-gradient-to-br from-gray-800 to-gray-900'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <h2
                    className={`text-2xl font-bold ${
                      theme === 'light' ? 'text-gray-800' : 'text-gray-100'
                    } mb-6`}
                  >
                    Ratings & Reviews
                  </h2>
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <motion.div
                          key={review.id}
                          className={`p-4 rounded-lg ${
                            theme === 'light' ? 'bg-gray-50' : 'bg-gray-800'
                          } flex gap-4 hover:bg-opacity-80 transition-colors`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            delay: 0.7 + review.id.split('-').pop() * 0.1,
                            duration: 0.3,
                          }}
                        >
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                              theme === 'light'
                                ? 'bg-indigo-200 text-indigo-700'
                                : 'bg-indigo-900 text-indigo-300'
                            }`}
                          >
                            {userProfiles[review.userId]?.email
                              ? userProfiles[review.userId].email.charAt(0).toUpperCase()
                              : '?'}
                          </div>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-medium ${
                                theme === 'light' ? 'text-gray-800' : 'text-gray-100'
                              }`}
                            >
                              {userProfiles[review.userId]?.email || 'Anonymous'}
                            </p>
                            <div className="flex items-center gap-1 my-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                  key={star}
                                  className={`w-4 h-4 ${
                                    star <= review.rating
                                      ? 'text-yellow-400'
                                      : theme === 'light'
                                      ? 'text-gray-300'
                                      : 'text-gray-600'
                                  }`}
                                />
                              ))}
                            </div>
                            <p
                              className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}
                            >
                              {review.review}
                            </p>
                            <p
                              className={`text-xs ${theme === 'light' ? 'text-gray-500' : 'text-gray-500'} mt-1`}
                            >
                              Posted: {review.timestamp.toDate().toLocaleString()}
                            </p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p
                      className={`text-lg ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}
                    >
                      No reviews yet.
                    </p>
                  )}
                </motion.section>
              </div>

              <motion.aside
                className="lg:w-1/4 lg:sticky lg:top-24 self-start"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              ></motion.aside>
            </div>
          </motion.div>
        </main>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            className={`relative w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-xl ${
              theme === 'light'
                ? 'bg-gradient-to-br from-blue-50 to-purple-50'
                : 'bg-gradient-to-br from-gray-800 to-gray-900'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <motion.button
              onClick={handleCloseModal}
              className={`absolute top-4 right-4 p-2 rounded-full ${
                theme === 'light' ? 'text-gray-600 hover:bg-gray-200' : 'text-gray-300 hover:bg-gray-700'
              } transition-colors`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Close modal"
            >
              <FaTimes className="h-5 w-5" />
            </motion.button>
            {showPostponeForm ? (
              <>
                <h2
                  className={`text-2xl font-bold ${
                    theme === 'light' ? 'text-gray-800' : 'text-gray-100'
                  } mb-6 text-center`}
                >
                  Update Screening Date
                </h2>
                <form onSubmit={handleUpdateScreeningDate} className="space-y-4">
                  <div>
                    <label
                      htmlFor="screeningDate"
                      className={`block text-sm font-medium ${
                        theme === 'light' ? 'text-gray-700' : 'text-gray-300'
                      } mb-1`}
                    >
                      New Screening Date
                    </label>
                    <EthiopianDatePicker
                      name="screeningDate"
                      value={newScreeningDate}
                      onChange={(e) => {
                        setNewScreeningDate(e.target.value);
                        setDateError('');
                      }}
                      error={dateError}
                      theme={theme}
                    />
                  </div>
                  <div className="flex justify-center gap-4">
                    <motion.button
                      type="submit"
                      className={`px-4 py-2 rounded-lg ${
                        theme === 'light'
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-500 text-white hover:bg-blue-600'
                      } transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label="Update"
                    >
                      Update
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setShowPostponeForm(false)}
                      className={`px-4 py-2 rounded-lg ${
                        theme === 'light'
                          ? 'bg-gray-300 text-gray-800 hover:bg-gray-400'
                          : 'bg-gray-600 text-gray-100 hover:bg-gray-700'
                      } transition-colors`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      aria-label="Cancel"
                    >
                      Cancel
                    </motion.button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <h2
                  className={`text-2xl font-bold ${
                    theme === 'light' ? 'text-gray-800' : 'text-gray-100'
                  } mb-6 text-center`}
                >
                  Ticket Options
                </h2>
                <div className="flex flex-col gap-4">
                  <motion.button
                    onClick={() => handleOpenDialog('cancel')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${
                      theme === 'light'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    } transition-colors`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Cancel ticket"
                  >
                    <FaTimes className="h-5 w-5" />
                    <span className="text-lg font-medium">Cancel Ticket</span>
                  </motion.button>
                  <motion.button
                    onClick={() => handleOpenDialog('postpone')}
                    className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${
                      theme === 'light'
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-purple-500 text-white hover:bg-purple-600'
                    } transition-colors`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Postpone"
                  >
                    <FaChevronDown className="h-5 w-5" />
                    <span className="text-lg font-medium">Postpone</span>
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <motion.div
            className={`relative w-full max-w-md p-6 sm:p-8 rounded-2xl shadow-xl ${
              theme === 'light'
                ? 'bg-gradient-to-br from-blue-50 to-purple-50'
                : 'bg-gradient-to-br from-gray-800 to-gray-900'
            }`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <h2
              className={`text-xl font-bold ${
                theme === 'light' ? 'text-gray-800' : 'text-gray-100'
              } mb-4 text-center`}
            >
              Confirm Action
            </h2>
            <p
              className={`text-center mb-6 ${theme === 'light' ? 'text-gray-600' : 'text-gray-300'}`}
            >
              {dialogMessage}
            </p>
            <div className="flex justify-center gap-4">
              <motion.button
                onClick={handleConfirmDialog}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'light'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                } transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Confirm"
              >
                Confirm
              </motion.button>
              <motion.button
                onClick={handleCancelDialog}
                className={`px-4 py-2 rounded-lg ${
                  theme === 'light'
                    ? 'bg-gray-300 text-gray-800 hover:bg-gray-400'
                    : 'bg-gray-600 text-gray-100 hover:bg-gray-700'
                } transition-colors`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Cancel"
              >
                Cancel
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}