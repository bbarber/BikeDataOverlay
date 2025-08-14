Current state is that it can display watts (mock data), and it can also list bluetooth devices (real data).

There is a known issue where if it calls /list more than once it throws errors on the backend.

Also, the connect feature seems to be mocked as well. It does not have the actual Bluetooth connection logic implemented.