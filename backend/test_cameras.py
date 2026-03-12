import cv2

def get_available_cameras(max_tested=10):
    available_cameras = []
    
    # Try different backends
    backends = [cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY]
    
    for i in range(max_tested):
        found = False
        for backend in backends:
            cap = cv2.VideoCapture(i, backend)
            if cap is not None and cap.isOpened():
                # Read a frame to ensure it actually works
                ret, frame = cap.read()
                if ret:
                    w = cap.get(cv2.CAP_PROP_FRAME_WIDTH)
                    h = cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
                    name = f"Camera {i} ({int(w)}x{int(h)})"
                    available_cameras.append({"index": i, "name": name})
                    found = True
                cap.release()
                break # if found with one backend, skip others for this index
        if not found and i > 2:
            break
            
    print(available_cameras)

if __name__ == '__main__':
    get_available_cameras()
