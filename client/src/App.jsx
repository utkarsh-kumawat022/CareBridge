import { useEffect, useRef, useState } from "react";
function DoctorView({ token }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchSharedRecords = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/documents/share/${token}`
        );

        const result = await response.json();

        if (!response.ok) {
          setError(
            result.message || "Unable to load shared records."
          );
          return;
        }

        setData(result);

      } catch (error) {
        console.error("Doctor view error:", error);
        setError("Unable to connect to CareBridge.");
      } finally {
        setLoading(false);
      }
    };

    fetchSharedRecords();
  }, [token]);

  if (loading) {
    return (
      <div className="doctor-page">
        <div className="doctor-card">
          <h2>Loading Medical Records...</h2>
          <p>Please wait while we securely retrieve the records.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="doctor-page">
        <div className="doctor-card">
          <h2>Unable to Access Records</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="doctor-page">

      <header className="doctor-header">
        <div>
          <div className="brand">CareBridge</div>
          <p>Secure Medical Record Viewer</p>
        </div>

        <span className="secure-badge">
          Secure Share
        </span>
      </header>

      <main className="doctor-content">

        <section className="doctor-card patient-card">
          <p className="section-label">PATIENT INFORMATION</p>

          <h1>{data.patient.name}</h1>

          <div className="patient-info-grid">
            <div>
              <span>Date of Birth</span>
              <strong>
                {data.patient.date_of_birth || "Not available"}
              </strong>
            </div>

            <div>
              <span>Blood Group</span>
              <strong>
                {data.patient.blood_group || "Not available"}
              </strong>
            </div>

            <div>
              <span>Emergency Contact</span>
              <strong>
                {data.patient.emergency_contact || "Not available"}
              </strong>
            </div>
          </div>
        </section>

        <section className="doctor-card">
          <div className="section-heading">
            <div>
              <p className="section-label">MEDICAL RECORDS</p>
              <h2>Documents</h2>
            </div>

            <span>
              {data.documents.length} records
            </span>
          </div>

          {data.documents.length === 0 ? (
            <p>No medical records available.</p>
          ) : (
            <div className="doctor-documents">
              {data.documents.map((document) => (
                <div
                  className="doctor-document"
                  key={document.id}
                >
                  <div>
                    <h3>{document.file_name}</h3>

                    <p>
                      {document.document_type ||
                        "Medical Document"}
                    </p>
                  </div>

                  <span className="completed-badge">
                    Completed
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="doctor-card">
          <div className="section-heading">
            <div>
              <p className="section-label">MEDICAL HISTORY</p>
              <h2>Timeline</h2>
            </div>

            <span>
              {data.timeline.length} events
            </span>
          </div>

          {data.timeline.length === 0 ? (
            <p>No timeline events available.</p>
          ) : (
            <div className="doctor-timeline">
              {data.timeline.map((event) => (
                <div
                  className="doctor-timeline-item"
                  key={event.id}
                >
                  <div className="timeline-dot"></div>

                  <div>
                    <span className="timeline-date">
                      {event.event_date}
                    </span>

                    <h3>{event.title}</h3>

                    {event.description && (
                      <p>{event.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="doctor-expiry">
          This medical record link is temporary and will expire
          automatically.
        </div>

      </main>
    </div>
  );
}
function MedicalSection({ title, items }) {

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <div className="medical-section">

      <h3>{title}</h3>

      <div className="medical-items">

        {items.map((item, index) => (
          <span
            className="medical-item"
            key={index}
          >
            {item}
          </span>
        ))}

      </div>

    </div>
  );
}
function App() {
  const path = window.location.pathname;

  if (path.startsWith("/share/")) {
    const token = path.split("/share/")[1];

    return <DoctorView token={token} />;
  }
  const [loggedIn, setLoggedIn] = useState(
    !!localStorage.getItem("token")
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const [documents, setDocuments] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [sharing, setSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const fileInputRef = useRef(null);

  const user = JSON.parse(
    localStorage.getItem("user") || "{}"
  );

  const handleLogin = async (e) => {
    e.preventDefault();

    setMessage("Logging in...");

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      setLoggedIn(true);
      setMessage("");

    } catch (error) {
      console.error("Login error:", error);
      setMessage("Unable to connect to server");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setLoggedIn(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      setUploadMessage("Please select a PDF file.");
      return;
    }

    setUploading(true);
    setUploadMessage("Uploading document...");

    try {
      const token = localStorage.getItem("token");

      const formData = new FormData();
      formData.append("document", file);

      const response = await fetch(
        "http://localhost:5000/api/documents/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setUploadMessage(
          data.message || "Upload failed"
        );
        return;
      }

      setUploadMessage(
        "Document uploaded successfully!"
      );

      // Refresh documents
      const documentsResponse = await fetch(
        "http://localhost:5000/api/documents",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const documentsData =
        await documentsResponse.json();

      if (documentsData.success) {
        setDocuments(documentsData.documents);
      }

    } catch (error) {
      console.error("Upload error:", error);
      setUploadMessage(
        "Unable to connect to server"
      );
    } finally {
      setUploading(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };
  const handleProcess = async (documentId) => {
    try {
      const token = localStorage.getItem("token");

      setUploadMessage("Analyzing medical document...");

      const response = await fetch(
        `http://localhost:5000/api/documents/${documentId}/process`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setUploadMessage(
          data.message || "Document analysis failed"
        );
        return;
      }

      setUploadMessage(
        "Document analyzed successfully!"
      );

      // Refresh documents
      const documentsResponse = await fetch(
        "http://localhost:5000/api/documents",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const documentsData =
        await documentsResponse.json();

      if (documentsData.success) {
        setDocuments(documentsData.documents);
      }

      // Refresh timeline
      const timelineResponse = await fetch(
        "http://localhost:5000/api/documents/timeline",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const timelineData =
        await timelineResponse.json();

      if (timelineData.success) {
        setTimeline(timelineData.timeline);
      }

    } catch (error) {
      console.error("Processing error:", error);

      setUploadMessage(
        "Unable to process document"
      );
    }
  };
  const handleAsk = async () => {
    if (!question.trim()) {
      return;
    }

    setAsking(true);
    setAnswer("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/documents/ask",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            question: question
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setAnswer(
          data.message || "Unable to answer your question."
        );
        return;
      }

      setAnswer(data.answer);

    } catch (error) {
      console.error("Ask records error:", error);

      setAnswer(
        "Unable to connect to the records assistant."
      );

    } finally {
      setAsking(false);
    }
  };
  const handleShare = async () => {
    setSharing(true);
    setShareUrl("");
    setShareMessage("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/documents/share",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setShareMessage(
          data.message || "Unable to create share link."
        );
        return;
      }

      setShareUrl(data.share_url);
      setShareMessage(
        "Secure share link created. It expires in 24 hours."
      );

    } catch (error) {
      console.error("Share error:", error);

      setShareMessage(
        "Unable to connect to server."
      );

    } finally {
      setSharing(false);
    }
  };
  const handleRevoke = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://localhost:5000/api/documents/share/revoke",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setShareMessage(
          data.message || "Unable to revoke share link."
        );
        return;
      }

      setShareUrl("");
      setShareMessage("Share link revoked successfully.");

    } catch (error) {
      console.error("Revoke share error:", error);

      setShareMessage(
        "Unable to connect to server."
      );
    }
  };

  useEffect(() => {
    if (!loggedIn) return;

    const token = localStorage.getItem("token");

    const fetchDashboardData = async () => {
      try {
        const headers = {
          Authorization: `Bearer ${token}`
        };

        setLoadingDocuments(true);
        const documentsResponse = await fetch(
          "http://localhost:5000/api/documents",
          { headers }
        );

        const documentsData =
          await documentsResponse.json();

        if (documentsData.success) {
          setDocuments(documentsData.documents);
        }

        const timelineResponse = await fetch(
          "http://localhost:5000/api/documents/timeline",
          { headers }
        );

        const timelineData =
          await timelineResponse.json();

        if (timelineData.success) {
          setTimeline(timelineData.timeline);
        }
        setLoadingTimeline(false);

      } catch (error) {
        console.error(
          "Dashboard data error:",
          error
        );
      } finally {
        setLoadingDocuments(false);
        setLoadingTimeline(false);
      }
    };

    fetchDashboardData();
  }, [loggedIn]);

  if (!loggedIn) {
    return (
      <div className="login-page">

        <div className="login-card">

          <h1>CareBridge</h1>

          <p className="subtitle">
            Your medical records, organized and connected.
          </p>

          <form onSubmit={handleLogin}>

            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              required
            />

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              required
            />

            <button type="submit">
              Login
            </button>

          </form>

          {message && (
            <p className="message">
              {message}
            </p>
          )}

        </div>

      </div>
    );
  }

  return (
    <div className="dashboard">

      {/* Header */}
      <header className="dashboard-header">

        <div>
          <h1>CareBridge</h1>
          <p>My Health Dashboard</p>
        </div>

        <div className="header-right">
          <span>
            Welcome, {user.name || "Patient"}
          </span>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>

      </header>
      <section className="welcome-section">
        <div>
          <p className="welcome-label">YOUR HEALTH, ORGANIZED</p>
          <h1>
            Welcome back, {JSON.parse(localStorage.getItem("user"))?.name || "Patient"}!
          </h1>
          <p className="welcome-text">
            Keep your medical records organized, accessible, and secure.
          </p>
        </div>
      </section>


      {/* Main content */}
      <main className="dashboard-content">

        <h2>Health Overview</h2>

        <div className="stats">

          <div className="stat-card">
            <h3>{documents.length}</h3>
            <p>Medical Documents</p>
          </div>

          <div className="stat-card">
            <h3>{timeline.length}</h3>
            <p>Timeline Events</p>
          </div>

          <div className="stat-card">
            <h3>AI</h3>
            <p>Records Assistant</p>
          </div>

          <div className="stat-card">
            <h3>24h</h3>
            <p>Share Link Duration</p>
          </div>

        </div>


        {/* Documents */}
        <section className="dashboard-section">

          <div className="section-header">
            <div>
              <h2>Medical Records</h2>
              <p className="section-subtitle">
                Your uploaded medical documents
              </p>
            </div>

            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                style={{ display: "none" }}
              />

              <button
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
              >
                {uploading
                  ? "Uploading..."
                  : "Upload Document"}
              </button>
            </>
          </div>
          {uploadMessage && (
            <p className="upload-message">
              {uploadMessage}
            </p>
          )}

          {documents.length === 0 ? (
            <p>No medical records found.</p>
          ) : (
            <div className="document-list">

              {documents.map((document) => (
                <div
                  className="document-card"
                  key={document.id}
                >
                  <div>
                    <h3>
                      {document.file_name}
                    </h3>

                    <p>
                      Status:{" "}
                      {document.status}
                    </p>
                    {document.status === "PROCESSING" && (
                      <button
                        className="analyze-button"
                        onClick={() => handleProcess(document.id)}
                      >
                        Analyze
                      </button>
                    )}
                  </div>

                  <div className="document-actions">

                    <span>
                      {document.document_type ||
                        "Medical Document"}
                    </span>

                    {document.status === "COMPLETED" && (
                      <button
                        className="view-button"
                        onClick={() => setSelectedDocument(document)}
                      >
                        View Details
                      </button>
                    )}

                  </div>

                </div>
              ))}

            </div>
          )}

        </section>


        {/* Timeline */}
        <section className="dashboard-section">

          <h2>Medical Timeline</h2>

          {timeline.length === 0 ? (
            <p>No timeline events found.</p>
          ) : (
            <div className="timeline">

              {timeline.map((event) => (
                <div
                  className="timeline-item"
                  key={event.id}
                >
                  <div className="timeline-dot"></div>

                  <div className="timeline-content">

                    <p className="timeline-date">
                      {new Date(
                        event.event_date
                      ).toLocaleDateString()}
                    </p>

                    <h3>
                      {event.title}
                    </h3>

                    <p>
                      {event.description}
                    </p>

                  </div>
                </div>
              ))}

            </div>
          )}

        </section>


        {/* Features */}
        <section className="feature-grid">

          <div className="feature-card ask-card">

            <h2>Ask My Records</h2>

            <p>
              Ask questions about your medical records
              and get answers based on your uploaded documents.
            </p>

            <div className="ask-form">

              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. What medications are mentioned in my records?"
                rows="3"
              />

              <button
                onClick={handleAsk}
                disabled={asking || !question.trim()}
              >
                {asking ? "Finding Answer..." : "Ask Records"}
              </button>

            </div>

            {answer && (
              <div className="answer-box">

                <span className="answer-label">
                  RECORDS ASSISTANT
                </span>

                <p>
                  {answer}
                </p>

              </div>
            )}

          </div>

          <div className="feature-card share-card">
            <h2>Share With Doctor</h2>

            <p>
              Create a secure temporary link that allows
              your doctor to view your medical records.
            </p>

            <button
              onClick={handleShare}
              disabled={sharing}
            >
              {sharing
                ? "Creating Secure Link..."
                : "Create Share Link"}
            </button>

            {shareMessage && (
              <p className="share-message">
                {shareMessage}
              </p>
            )}

            {shareUrl && (
              <div className="share-result">
                <span className="share-label">
                  SECURE SHARE LINK
                </span>

                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  onClick={(e) => e.target.select()}
                />

                <button
                  className="copy-button"
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    setShareMessage("Link copied!");
                  }}
                >
                  Copy Link
                </button>
                <button
                  className="revoke-button"
                  onClick={handleRevoke}
                >
                  Revoke Share Link
                </button>
              </div>
            )}
          </div>

        </section>
        {selectedDocument && (
          <div
            className="modal-overlay"
            onClick={() => setSelectedDocument(null)}
          >
            <div
              className="medical-modal"
              onClick={(e) => e.stopPropagation()}
            >

              <div className="modal-header">

                <div>
                  <p className="modal-label">
                    MEDICAL RECORD
                  </p>

                  <h2>
                    {selectedDocument.file_name}
                  </h2>
                </div>

                <button
                  className="close-button"
                  onClick={() => setSelectedDocument(null)}
                >
                  ×
                </button>

              </div>


              {selectedDocument.extracted_data?.medical_data ? (

                <div className="medical-details">

                  <MedicalSection
                    title="Diagnoses"
                    items={
                      selectedDocument
                        .extracted_data
                        .medical_data
                        .diagnoses
                    }
                  />

                  <MedicalSection
                    title="Symptoms"
                    items={
                      selectedDocument
                        .extracted_data
                        .medical_data
                        .symptoms
                    }
                  />

                  <MedicalSection
                    title="Medications"
                    items={
                      selectedDocument
                        .extracted_data
                        .medical_data
                        .medications
                    }
                  />

                  <MedicalSection
                    title="Tests"
                    items={
                      selectedDocument
                        .extracted_data
                        .medical_data
                        .tests
                    }
                  />

                  <MedicalSection
                    title="Procedures"
                    items={
                      selectedDocument
                        .extracted_data
                        .medical_data
                        .procedures
                    }
                  />

                  <MedicalSection
                    title="Medical History"
                    items={
                      selectedDocument
                        .extracted_data
                        .medical_data
                        .medical_history
                    }
                  />

                  <MedicalSection
                    title="Important Dates"
                    items={
                      selectedDocument
                        .extracted_data
                        .medical_data
                        .important_dates
                    }
                  />

                </div>

              ) : (
                <p className="no-data">
                  No extracted medical information available.
                </p>
              )}

            </div>
          </div>
        )}

      </main>

    </div>
  );
}

export default App;