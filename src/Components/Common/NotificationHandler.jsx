import React, { useEffect, useRef } from "react";
import {
  messaging,
  onMessage,
  requestForToken,
} from "../../firebase";
import { toast } from "react-toastify";
import { useUser } from "../UserContext";
import { portalInstance } from "../../Services/instance";

const VAPID_KEY =
  "BMk1ZMlXZaNTmS4i2RN8oq0yIgCLtkJYKNXykLtyAKyIwf6nx3XlcBNpOZMf_sxiI_dLaVQseXJbnV5_IBMW1Nc";

const NotificationHandler = () => {
  const { user } = useUser();
  const unsubscribeRef = useRef(null);

  // console.log("[FCM DEBUG] UserContext user:", user);
  // console.log("[FCM DEBUG] User ID:", user?._id);
  // console.log("[FCM DEBUG] User token:", user?.token);
  useEffect(() => {
    // No logged-in user
    if (!user?._id) {
      // console.log("[FCM] No logged-in user");
      return;
    }

    let cancelled = false;

    const setupNotifications = async () => {
      try {
        // console.log(
        //   "[FCM] Setting up notifications for employee:",
        //   user._id
        // );

        // 1. Get FCM token
        const token = await requestForToken(VAPID_KEY);
        // console.log("[FCM TEST] Logged-in User ID:", user?._id);
        // console.log("[FCM TEST] FCM Token:", token);

        if (cancelled) {
          return;
        }

        if (!token) {
          console.warn("[FCM] FCM token not received");
          return;
        }

        // console.log("[FCM] FCM token received:", token);

        // 2. Save token for CURRENT logged-in employee
        await portalInstance.post(
          "/api/notifications/save-token",
          {
            token,
          }
        );

        sessionStorage.setItem("fcm_token", token);
        sessionStorage.setItem("fcm_user_id", user._id);

        // console.log(
        //   "[FCM] Token successfully synced for employee:",
        //   user._id
        // );

        if (cancelled) {
          return;
        }

        // 3. Remove old listener if present
        if (unsubscribeRef.current) {
          unsubscribeRef.current();
          unsubscribeRef.current = null;
        }

        // 4. Foreground listener
        unsubscribeRef.current = onMessage(
          messaging,
          (payload) => {
            // console.log(
            //   "[FCM] Foreground message received:",
            //   payload
            // );

            const title =
              payload.notification?.title ||
              payload.data?.title ||
              "HR Portal Alert";

            const body =
              payload.notification?.body ||
              payload.data?.body ||
              "";

            const ticketId =
              payload.data?.ticketId;

            // console.log(
            //   `[FCM] Displaying foreground notification: "${title}" | Ticket: ${ticketId || "N/A"}`
            // );

            // Show in-app toast only
            toast.info(
              <div
                style={{ cursor: "pointer" }}
                onClick={() => window.focus()}
              >
                <strong>{title}</strong>

                <div
                  style={{
                    fontSize: "0.85rem",
                    marginTop: "4px",
                  }}
                >
                  {body}
                </div>

                {ticketId && (
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#666",
                      marginTop: "4px",
                    }}
                  >
                    ID: {ticketId}
                  </div>
                )}
              </div>,
              {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
              }
            );
          }
        );
      } catch (error) {
        console.error(
          "[FCM] Notification setup failed:",
          error
        );
      }
    };

    setupNotifications();

    // Cleanup when employee changes/logout/component unmounts
    return () => {
      cancelled = true;

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // console.log(
      //   "[FCM] Notification listener cleaned up for employee:",
      //   user._id
      // );
    };
  }, [user?._id]);

  return null;
};

export default NotificationHandler;