import { Webhook } from "svix";
import User from "../models/User.js";
import stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";
import { CourseProgress } from "../models/CourseProgress.js";



// API Controller Function to Manage Clerk User with database
/* export const clerkWebhooks = async (req, res) => {
  try {

    // Create a Svix instance with clerk webhook secret.
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

    // Verifying Headers
    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"]
    })

    // Getting Data from request body
    const { data, type } = req.body

    // Switch Cases for differernt Events
    switch (type) {
      case 'user.created': {

        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
          resume: ''
        }
        await User.create(userData)
        res.json({})
        break;
      }

      case 'user.updated': {
        const userData = {
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
        }
        await User.findByIdAndUpdate(data.id, userData)
        res.json({})
        break;
      }

      case 'user.deleted': {
        await User.findByIdAndDelete(data.id)
        res.json({})
        break;
      }
      default:
        break;
    }

  } catch (error) {
    res.json({ success: false, message: error.message })
  }
} */
// API Controller Function to Manage Clerk User with database
export const clerkWebhooks = async (req, res) => {
  try {

    // Create a Svix instance with clerk webhook secret.
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

    // Verifying Headers
    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"]
    })

    // Getting Data from request body
    const { data, type } = req.body

    // Switch Cases for differernt Events
    switch (type) {
      case 'user.created': {

        const userData = {
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
          resume: ''
        }
        await User.create(userData)
        res.json({})
        break;
      }

      case 'user.updated': {
        const userData = {
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
        }
        await User.findByIdAndUpdate(data.id, userData)
        res.json({})
        break;
      }

      case 'user.deleted': {
        await User.findByIdAndDelete(data.id)
        res.json({})
        break;
      }
      default:
        break;
    }

  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}


// Stripe Gateway Initialize


const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  // 1️⃣ VERIFY SIGNATURE (RAW BODY)
  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body, // MUST be raw buffer
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Stripe signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2️⃣ PROCESS EVENT
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const purchaseId = session?.metadata?.purchaseId;

        console.log("➡️ checkout.session.completed received");
        console.log("➡️ purchaseId:", purchaseId);

        if (!purchaseId) {
          console.error("❌ purchaseId missing in metadata");
          break;
        }

        const purchase = await Purchase.findById(purchaseId);
        if (!purchase) {
          console.error("❌ Purchase not found:", purchaseId);
          break;
        }

        // 🔒 idempotency (Stripe retries)
        if (purchase.status === "completed") {
          console.log("⚠️ Purchase already completed:", purchaseId);
          break;
        }

        const user = await User.findById(purchase.userId);
        const course = await Course.findById(purchase.courseId);

        if (!user || !course) {
          console.error("❌ User or Course missing", {
            userExists: !!user,
            courseExists: !!course,
          });
          break;
        }

        // 3️⃣ ENROLL USER
        if (!course.enrolledStudents.includes(user._id)) {
          course.enrolledStudents.push(user._id);
          await course.save();
        }

        if (!user.enrolledCourses.includes(course._id)) {
          user.enrolledCourses.push(course._id);
          await user.save();
        }

        // 4️⃣ UPDATE PURCHASE
        purchase.status = "completed";
        purchase.completedAt = new Date(); // THIS fixes your date issue
        await purchase.save();

        console.log("✅ Purchase marked completed:", purchaseId);
        break;
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object;
        const purchaseId = session?.metadata?.purchaseId;

        if (purchaseId) {
          await Purchase.findByIdAndUpdate(purchaseId, {
            status: "failed",
          });
          console.log("❌ Payment failed:", purchaseId);
        }
        break;
      }

      default:
        console.log("ℹ️ Unhandled Stripe event:", event.type);
    }

    // 5️⃣ TELL STRIPE WE SUCCEEDED
    return res.status(200).json({ received: true });

  } catch (err) {
    console.error("❌ Webhook processing error:", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
};



export const certificateWebhook = async (req, res) => {
  try {
    // Verify secret token for security
    const webhookSecret = process.env.PDFMONKEY_WEBHOOK_SECRET; // set this in your Vercel env
    const incomingSecret = req.headers['x-pdfmonkey-signature'];

    if (!incomingSecret || incomingSecret !== webhookSecret) {
      console.log("Webhook: invalid or missing secret");
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { document } = req.body;

    if (!document) {
      console.log("Webhook: missing document in body", req.body);
      return res.status(400).json({ success: false, message: "Missing document data" });
    }

    // Extract metadata and download_url
    const { userId, courseId } = document.metadata || {};
    const download_url = document.attributes?.download_url;

    if (!userId || !courseId || !download_url) {
      console.log("Webhook: missing userId/courseId/download_url", document);
      return res.status(400).json({ success: false, message: "Incomplete data" });
    }

    // Update CourseProgress with final certificate URL
    const progress = await CourseProgress.findOne({ userId, courseId });
    if (!progress) {
      console.log("Webhook: CourseProgress not found for", { userId, courseId });
      return res.status(404).json({ success: false, message: "CourseProgress not found" });
    }

    progress.certificateUrl = download_url;
    await progress.save();

    console.log("Webhook: Certificate URL updated for user", userId, "course", courseId);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};
