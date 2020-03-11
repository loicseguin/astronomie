import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
sns.set()

# Get data https://nssdc.gsfc.nasa.gov/planetary/factsheet/
temperatures = np.array([167, 464, 15, -65, -110, -140, -195, -200])
distances = np.array(
    [57.9, 108.2, 149.6, 227.9, 778.6, 1433.5, 2872.5, 4495.1])

# Plot it!
plt.rcParams["axes.labelsize"] = 16
plt.rcParams["xtick.labelsize"] = 14
plt.rcParams["ytick.labelsize"] = 14
fig, ax = plt.subplots()
ax.plot(distances, temperatures, '.-', lw=1)
ax.set_xlabel("Distance (millions km)")
ax.set_ylabel("Température moyenne (°C)")
plt.tight_layout()

plt.savefig("temperatures-planetes.png")
